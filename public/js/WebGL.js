const GRAVITY = 9.81;
const CUBE = [
	-1,  1, -1,
	-1, -1, -1,
	1, -1, -1,
	1, -1, -1,
	1,  1, -1,
	-1,  1, -1,

	-1, -1,  1,
	-1, -1, -1,
	-1,  1, -1,
	-1,  1, -1,
	-1,  1,  1,
	-1, -1,  1,

	1, -1, -1,
	1, -1,  1,
	1,  1,  1,
	1,  1,  1,
	1,  1, -1,
	1, -1, -1,

	-1, -1,  1,
	-1,  1,  1,
	1,  1,  1,
	1,  1,  1,
	1, -1,  1,
	-1, -1,  1,

	-1,  1, -1,
	1,  1, -1,
	1,  1,  1,
	1,  1,  1,
	-1,  1,  1,
	-1,  1, -1,

	-1, -1, -1,
	-1, -1,  1,
	1, -1, -1,
	1, -1, -1,
	-1, -1,  1,
	1, -1,  1
];

function fetchShader(vertexUrl,fragmentUrl){
	return new Promise(async resolve => {
		let vertexSource = await fetch(vertexUrl).then(async res => {
			return await res.body.getReader().read().then(buffer => {
				return new TextDecoder("utf-8").decode(buffer.value);
			});
		});
		let fragmentSource = await fetch(fragmentUrl).then(async res => {
			return await res.body.getReader().read().then(buffer => {
				return new TextDecoder("utf-8").decode(buffer.value);
			});
		});
		resolve({vertexSource,fragmentSource});
	});
}
function createTransformationMatrix(translation,rotation,scale){
	translation = vec3.fromValues(translation.x,translation.y,translation.z);
	let matrix = mat4.create();
	mat4.identity(matrix);
	mat4.translate(matrix,matrix,translation);
	mat4.rotateX(matrix,matrix,rotation.x);
	mat4.rotateY(matrix,matrix,rotation.y);
	mat4.rotateZ(matrix,matrix,rotation.z);
	mat4.scale(matrix,matrix,vec3.fromValues(scale,scale,scale));
	return matrix;
}
function createViewMatrix(camera){
	let matrix = mat4.create();
	mat4.identity(matrix);
	mat4.rotateX(matrix,matrix,camera.rotation.x);
	mat4.rotateY(matrix,matrix,camera.rotation.y);
	mat4.rotateZ(matrix,matrix,camera.rotation.z);
	let negativeCameraPos = vec3.fromValues(-camera.position.x,-camera.position.y,-camera.position.z);
	mat4.translate(matrix,matrix,negativeCameraPos);
	return matrix;
}

class Vector3f{
	constructor(x,y,z){
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
		if(typeof x == 'object' && !y && !z){
			this.x = x[0];
			this.y = x[1];
			this.z = x[2];
		}
	}
	copy(){
		return new Vector3f(this.x,this.y,this.z);
	}
	add(vec){
		this.x += vec.x;
		this.y += vec.y;
		this.z += vec.z;
		return this;
	}
	sub(vec){
		this.x -= vec.x;
		this.y -= vec.y;
		this.z -= vec.z;
		return this;
	}
	mult(scl){
		this.x *= scl;
		this.y *= scl;
		this.z *= scl;
		return this;
	}
	norm(){
		let len = 1 / Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
		this.x *= len;
		this.y *= len;
		this.z *= len;
		return this;
	}
	clamp(min,max){
		this.x = this.x < max ? this.x > min ? this.x : min : max;
		this.y = this.y < max ? this.y > min ? this.y : min : max;
		this.z = this.z < max ? this.z > min ? this.z : min : max;
		return this;
	}
	applyQuaternion(q){
		var x = this.x, y = this.y, z = this.z;
		var qx = q.x, qy = q.y, qz = q.z, qw = q.w;
		var ix = qw * x + qy * z - qz * y;
		var iy = qw * y + qz * x - qx * z;
		var iz = qw * z + qx * y - qy * x;
		var iw = - qx * x - qy * y - qz * z;
		this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
		this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
		this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;
		return this;
	}
	toString(){
		return `{${this.x},${this.y},${this.z}}`;
	}
}
class Quaternion{
	constructor(x,y,z,w){
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
		this.w = w || 0;
		if(typeof x == 'object' && !y && !z){
			this.x = x[0];
			this.y = x[1];
			this.z = x[2];
			this.w = x[3];
		}
	}
}
class Cube{
	constructor(size){
		let model = [];
		for(let i = 0;i < CUBE.length;i++)model[i] = CUBE[i] * size;
		this.vertexCount = CUBE.length/3;
		this.vertices = gl.createBuffer(gl.ARRAY_BUFFER);
		gl.bindBuffer(gl.ARRAY_BUFFER,this.vertices);
		gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(model),gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER,null);
	}
}

class Loader {
	createModel(id,vertices,indices,textureCoords,normals){
		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);
		this.storeData(0,3,vertices);
		this.storeData(1,2,textureCoords);
		this.storeData(2,3,normals);
		gl.bindVertexArray(null);
		let indexBuffer = this.indexBuffer(indices);
		return new Model(id,vao,indexBuffer,indices.length);
	}
	storeData(index,size,data){
		let buff = gl.createBuffer(gl.ARRAY_BUFFER);
		gl.bindBuffer(gl.ARRAY_BUFFER,buff);
		gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
		gl.vertexAttribPointer(index,size,gl.FLOAT,false,0,0);
		gl.bindBuffer(gl.ARRAY_BUFFER,null);
	}
	indexBuffer(indices){
		let buff = gl.createBuffer(gl.ELEMENT_ARRAY_BUFFER);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buff);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);
		return buff;
	}
	async loadObj(id, filename) {
		return await fetch(filename).then(res => {
			const reader = res.body.getReader();
			let file = "";
			let vertices = new Array();
			let textures = new Array();
			let normals = new Array();
			let indices = new Array();
			return reader.read().then(function readChunk(buffer) {
					if (buffer.done) return file;
					file += new TextDecoder('utf-8').decode(buffer.value);
					return reader.read().then(readChunk);
				})
				.then(file => {
					file = file.trim() + '\n';
					const lines = file.split('\n');
					lines.forEach(line => {
						line = line.trim();
						let values = line.split(' ');
						let token = values.shift().trim();
						switch (token) {
							case 'v':
								vertices.push([parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2])]);
								break;
							case 'vt':
								textures.push([parseFloat(values[0]), parseFloat(values[1])]);
								break;
							case 'vn':
								normals.push([parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2])]);
								break;
							case 'f':
								for (let i = 0; i < values.length; i++) {
									let vertexData = values[i].split('/');
									indices.push({
										vertex: parseInt(vertexData[0]) - 1,
										texture: parseInt(vertexData[1]) - 1,
										normal: parseInt(vertexData[2]) - 1,
										hashCode: vertexData[0] + '/' + vertexData[1] + '/' + vertexData[2]
									});
								}
								break;
						}
					})
					let sortedVertices = new Array();
					let sortedTextures = new Array();
					let sortedNormals = new Array();
					let sortedIndices = new Array();
					let indexMap = new Array();
					for (let i = 0; i < indices.length; i++) {
						let index = indices[i];
						let currentVertex = vertices[index.vertex];
						let currentTexture = textures[index.texture];
						let currentNormal = normals[index.normal];

						if (index.hashCode in indexMap) {
							sortedIndices.push(indexMap[index.hashCode]);
						} else {
							indexMap[index.hashCode] = sortedVertices.length / 3;
							sortedIndices.push(sortedVertices.length / 3);

							sortedVertices.push(currentVertex[0], currentVertex[1], currentVertex[2]);
							sortedTextures.push(currentTexture[0], 1 - currentTexture[1]);
							sortedNormals.push(currentNormal[0], currentNormal[1], currentNormal[2]);
						}
					}
					return this.createModel(id, sortedVertices, sortedIndices, sortedTextures, sortedNormals);
				})
				.catch(e => {
					console.error(e)
				});
		});
	}

	static loadTexture(textureUrl){
		return new Promise((resolve,error) => {
			const textureID = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D,textureID);
			gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
			let img = new Image();
			img.src = textureUrl;
			img.onload = () => {
				gl.bindTexture(gl.TEXTURE_2D, textureID);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				if (gl.getExtension('EXT_texture_filter_anisotropic')) {
					let ext = gl.getExtension('EXT_texture_filter_anisotropic');
					let amount = Math.min(4, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
					gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, amount);
				}
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.bindTexture(gl.TEXTURE_2D, null);
				resolve(textureID)
			}
			img.onerror = () => {
				error({msg:'Unable to load texture: file not found!'});
			}
		});
	}
	static createTextureFromColor(color) {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255 * color.x, 255 * color.y, 255 * color.z, 255]));
		gl.bindTexture(gl.TEXTURE_2D, null);
		return texture;
	}

	static createEmptyEnviromentMap(resolution) {
		const textureID = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, textureID);
		for (let i = 0; i < 6; i++) {
			gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA16F, resolution, resolution, 0, gl.RGBA, gl.FLOAT, null);
		}
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		return textureID;
	}
	static createEnviromentMap(resolution, sky, fog) {
		let model = new Cube(1);
		let fbo = gl.createFramebuffer();
		let texture = loader.createEmptyEnviromentMap(resolution);
		let shader = new ShaderProgram(
			`#version 300 es
					in vec3 position;
					out float height;
					uniform mat4 viewMatrix;
					uniform mat4 projectionMatrix;
					void main(void){
						height = (position.y + 1.0) / 2.0;
						gl_Position = projectionMatrix * viewMatrix * vec4(position,1.0);
					}`,
			`#version 300 es
					precision mediump float;
					in float height;
					out vec4 out_Color;
					uniform vec3 fogColor;
					uniform vec3 skyColor;
					void main(void){
						out_Color = vec4(mix(fogColor,skyColor,height),1.0);
					}`
		);
		let projectionMatrix = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 10);
		let views = [
			mat4.lookAt(mat4.create(), [0, 0, 0], [1, 0, 0], [0, -1, 0]),
			mat4.lookAt(mat4.create(), [0, 0, 0], [-1, 0, 0], [0, -1, 0]),
			mat4.lookAt(mat4.create(), [0, 0, 0], [0, 1, 0], [0, 0, 1]),
			mat4.lookAt(mat4.create(), [0, 0, 0], [0, -1, 0], [0, 0, -1]),
			mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, 1], [0, -1, 0]),
			mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, -1], [0, -1, 0])
		];
		
		gl.useProgram(shader.programID);
		gl.bindAttribLocation(shader.programID, 0, 'position');
		gl.uniform3f(gl.getUniformLocation(shader.programID, 'fogColor'), fog.x, fog.y, fog.z);
		gl.uniform3f(gl.getUniformLocation(shader.programID, 'skyColor'), sky.x, sky.y, sky.z);
		gl.uniformMatrix4fv(gl.getUniformLocation(shader.programID, 'projectionMatrix'), false, projectionMatrix);
		gl.viewport(0, 0, resolution, resolution);

		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		for (let i = 0; i < 6; i++) {
			gl.uniformMatrix4fv(gl.getUniformLocation(shader.programID, 'viewMatrix'), false, views[i]);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, texture, 0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.bindBuffer(gl.ARRAY_BUFFER, model.vertices);
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(0);
			gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
			gl.disableVertexAttribArray(0);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		return texture;
	}
	static loadEnviromentMapHDR(textureUrl) {
		return new Promise(resolve => {
			const textureID = gl.createTexture();
			let envMap = new EnviromentMap(textureID);
			let img = new HDRImage();
			img.onload = function () {
				gl.bindTexture(gl.TEXTURE_2D, textureID);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img.dataRGBE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.bindTexture(gl.TEXTURE_2D, null);

				envMap.prepare().then(() => {
					envMap.compute();
					resolve(envMap.textureID);
				});
			};
			img.src = textureUrl;
		})
	}
	static loadEnviromentMapTGA(textureUrls) {
		return new Promise(resolve => {
			const textureID = gl.createTexture();
			let tga = new TGA();
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, textureID);
			for (let i = 0; i < 6; i++) {
				fetch(textureUrls[i]).then(res => {
					let data = new Uint8Array(res.arrayBuffer());
					tga.load(data);
					let img = tga.getCanvas();
					gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
				});
			}
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.bindTexture(gl.TEXTURE_2D, null)
		});
	}
}
// Shaders
	class ShaderProgram {
		constructor(vertexSource,fragmentSource){
			this.vertexShader = this.loadShader(vertexSource,gl.VERTEX_SHADER);
			this.fragmentShader = this.loadShader(fragmentSource,gl.FRAGMENT_SHADER);
			this.programID = gl.createProgram();
			gl.attachShader(this.programID, this.vertexShader);
			gl.attachShader(this.programID, this.fragmentShader);
			this.bindAttributes();
			gl.linkProgram(this.programID);
			gl.validateProgram(this.programID);
			this.getAllUniformLocations();
		}
		start(){
			gl.useProgram(this.programID);
		}
		getUniformLocation(uniformName){
			return gl.getUniformLocation(this.programID,uniformName);
		}
		bindAttribute(attribute, variableName){
			gl.bindAttribLocation(this.programID,attribute,variableName);
		}
		loadFloat(location,value){
			gl.uniform1f(location,value);
		}
		loadInt(location,value){
			gl.uniform1i(location,value);
		}
		loadVector(location,vector){
			gl.uniform3f(location,vector.x,vector.y,vector.z);
		}
		loadBool(location,value){
			gl.uniform1f(location,value ? 1.0 : 0.0)
		}
		loadMatrix(location,matrix){
			gl.uniformMatrix4fv(location,false,matrix);
		}
		loadShader(source, type){
			const shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				alert((type == gl.VERTEX_SHADER ? 'vertex' : 'fragment') + ' shader: ' + gl.getShaderInfoLog(shader));
				gl.deleteShader(shader);
				return null;
			}
			return shader;
		}
		bindAttributes(){}
		getAllUniformLocations(){}
	}
	class StaticShader extends ShaderProgram {
		constructor(vertexSource,fragmentSource){
			super(vertexSource,fragmentSource);
		}
		bindAttributes(){
			super.bindAttribute(0,'position');
			super.bindAttribute(1,'texture');
			super.bindAttribute(2,'normal');
		}
		getAllUniformLocations(){
			this.location_transformationMatrix = super.getUniformLocation('transformationMatrix');
			this.location_projectionMatrix = super.getUniformLocation('projectionMatrix');
			this.location_viewMatrix = super.getUniformLocation('viewMatrix');
			this.location_material = {
				normalMap:super.getUniformLocation('material.normalMap'),
				diffuseMap:super.getUniformLocation('material.diffuseMap'),
				metalnessMap:super.getUniformLocation('material.metalnessMap'),
				roughnessMap:super.getUniformLocation('material.roughnessMap'),
				occlusionMap:super.getUniformLocation('material.occlusionMap')
			}
			this.location_pbr = {
				enviroment:super.getUniformLocation('pbr.enviroment'),
				irradiance:super.getUniformLocation('pbr.irradiance'),
				prefiltered:super.getUniformLocation('pbr.prefiltered')
			}
			this.location_lights = [];
			for(let i = 0;i < 10;i++){
				this.location_lights[i] = {
					color:super.getUniformLocation('lights['+i+'].color'),
					position:super.getUniformLocation('lightPositions['+i+']'),
					brightness:super.getUniformLocation('lights['+i+'].brightness')
				}
			}
		}
		linkTextures(){
			super.loadInt(this.location_material.diffuseMap,0);
			super.loadInt(this.location_material.normalMap,1);
			super.loadInt(this.location_material.metalnessMap,2);
			super.loadInt(this.location_material.roughnessMap,3);
			super.loadInt(this.location_material.occlusionMap,4);
			super.loadInt(this.location_pbr.enviroment,5);
			super.loadInt(this.location_pbr.irradiance,6);
			super.loadInt(this.location_pbr.prefiltered,7);
		}
		loadLights(lights){
			for(let i = 0;i < 10;i++){
				if(lights[i]){
					super.loadVector(this.location_lights[i].color, lights[i].color);
					super.loadVector(this.location_lights[i].position, lights[i].position);
					super.loadFloat(this.location_lights[i].brightness, lights[i].brightness)
				}
			}
		}
		loadTransformationMatrix(matrix){
			super.loadMatrix(this.location_transformationMatrix,matrix);
		}
		loadProjectionMatrix(matrix){
			super.loadMatrix(this.location_projectionMatrix,matrix);
		}
		loadViewMatrix(matrix){
			super.loadMatrix(this.location_viewMatrix,matrix);
		}
	}
	class TerrainShader extends ShaderProgram {
		constructor(vertexSource,fragmentSource){
			super(vertexSource,fragmentSource);
		}
		bindAttributes(){
			super.bindAttribute(0,'position');
			super.bindAttribute(1,'texture');
			super.bindAttribute(2,'normal');
		}
		getAllUniformLocations(){
			this.location_transformationMatrix = super.getUniformLocation('transformationMatrix');
			this.location_projectionMatrix = super.getUniformLocation('projectionMatrix');
			this.location_viewMatrix = super.getUniformLocation('viewMatrix');
			this.location_material = {
				normalMap:super.getUniformLocation('material.normalMap'),
				diffuseMap:super.getUniformLocation('material.diffuseMap'),
				metalnessMap:super.getUniformLocation('material.metalnessMap'),
				roughnessMap:super.getUniformLocation('material.roughnessMap'),
				occlusionMap:super.getUniformLocation('material.occlusionMap')
			}
			this.location_pbr = {
				enviroment:super.getUniformLocation('pbr.enviroment'),
				irradiance:super.getUniformLocation('pbr.irradiance'),
				prefiltered:super.getUniformLocation('pbr.prefiltered')
			}
			this.location_lights = [];
			for(let i = 0;i < 20;i++){
				this.location_lights[i] = {
					color:super.getUniformLocation('lights['+i+'].color'),
					position:super.getUniformLocation('lightPositions['+i+']'),
					brightness:super.getUniformLocation('lights['+i+'].brightness')
				}
			}
		}
		linkTextures(){
			super.loadInt(this.location_material.diffuseMap,0);
			super.loadInt(this.location_material.normalMap,1);
			super.loadInt(this.location_material.metalnessMap,2);
			super.loadInt(this.location_material.roughnessMap,3);
			super.loadInt(this.location_material.occlusionMap,4);
			super.loadInt(this.location_pbr.enviroment,5);
			super.loadInt(this.location_pbr.irradiance,6);
			super.loadInt(this.location_pbr.prefiltered,7);
		}
		loadLights(lights){
			for(let i = 0;i < 20;i++){
				if(lights[i]){
					super.loadVector(this.location_lights[i].color, lights[i].color);
					super.loadVector(this.location_lights[i].position, lights[i].position);
					super.loadFloat(this.location_lights[i].brightness, lights[i].brightness)
				}
			}
		}
		loadTransformationMatrix(matrix){
			super.loadMatrix(this.location_transformationMatrix,matrix);
		}
		loadProjectionMatrix(matrix){
			super.loadMatrix(this.location_projectionMatrix,matrix);
		}
		loadViewMatrix(matrix){
			super.loadMatrix(this.location_viewMatrix,matrix);
		}
	}
	class SkyboxShader extends ShaderProgram {
		constructor(vertexSource,fragmentSource){
			super(vertexSource,fragmentSource);
		}
		bindAttributes(){
			super.bindAttribute(0,'position');
		}
		getAllUniformLocations(){
			this.location_projectionMatrix = super.getUniformLocation('projectionMatrix');
			this.location_viewMatrix = super.getUniformLocation('viewMatrix');
		}
		loadProjectionMatrix(matrix){
			super.loadMatrix(this.location_projectionMatrix,matrix);
		}
		loadViewMatrix(matrix){
			matrix[12] = 0;
			matrix[13] = 0;
			matrix[14] = 0;
			super.loadMatrix(this.location_viewMatrix,matrix);
		}
	}
	class PBRPrecomputeShader extends ShaderProgram {
		constructor(vertexSource,fragmentSource){
			super(vertexSource,fragmentSource);
		}
		bindAttributes(){
			super.bindAttribute(0,'position');
		}
		getAllUniformLocations(){
			this.location_projectionMatrix = super.getUniformLocation('projectionMatrix');
			this.location_viewMatrix = super.getUniformLocation('viewMatrix');
		}
		loadProjectionMatrix(matrix){
			super.loadMatrix(this.location_projectionMatrix,matrix);
		}
		loadViewMatrix(matrix){
			matrix[12] = 0;
			matrix[13] = 0;
			matrix[14] = 0;
			super.loadMatrix(this.location_viewMatrix,matrix);
		}
	}

// Renderers
	class Renderer {
		constructor(shaders){
			this.shaders = shaders;
			this.renderFBO = gl.createFramebuffer();
			this.updateProjMatrix();
			// this.fbo = gl.createFramebuffer();
			// this.cbo = gl.createTexture();
			// this.dbo = gl.createRenderbuffer();
			// gl.bindRenderbuffer(gl.RENDERBUFFER,this.dbo);
			// gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,canvas.width,canvas.height);
			// gl.bindRenderbuffer(gl.RENDERBUFFER, null);
			// gl.bindTexture(gl.TEXTURE_2D, this.cbo);
			// gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,canvas.width,canvas.height,0,gl.RGBA,gl.FLOAT,null);
			// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			// gl.bindTexture(gl.TEXTURE_2D, null);
		}
		updateProjMatrix(){
			this.FOV = 75.0 * (Math.PI / 180);
			this.NEAR_PLANE = 0.1;
			this.FAR_PLANE = 1000;
			this.projectionMatrix = mat4.create();
			mat4.perspective(this.projectionMatrix,
				this.FOV,
				canvas.width / canvas.height,
				this.NEAR_PLANE,
				this.FAR_PLANE
			);
			for (let i in this.shaders) {
				this.shaders[i].start();
				this.shaders[i].loadProjectionMatrix(this.projectionMatrix);
			}
		}
		prepare(){
			this.updateProjMatrix();
			gl.enable(gl.CULL_FACE);
			gl.enable(gl.DEPTH_TEST);
			gl.viewport(0,0,canvas.width,canvas.height);
			gl.clearColor(0.0, 0.0, 0.0, 1.0);
		}
		renderScene(scene){
			// gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
			// gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.cbo, 0);
			// gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.dbo);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			this.currentScene = scene;
			let viewMatrix = createViewMatrix(this.currentScene.camera);
			this.shaders.staticShader.start();
			this.shaders.staticShader.loadLights(this.currentScene.lights);
			this.shaders.staticShader.loadViewMatrix(viewMatrix);
			for(let entity of scene.entities){
				this.renderEntity(entity);
			}
			this.shaders.terrainShader.start();
			this.shaders.terrainShader.loadLights(this.currentScene.lights);
			this.shaders.terrainShader.loadViewMatrix(viewMatrix);
			for(let terrain of scene.terrains){
				this.renderTerrain(terrain)
			}
			this.shaders.skyboxShader.start();
			this.shaders.skyboxShader.loadViewMatrix(viewMatrix);
			if(this.currentScene.skybox)
				this.renderSkyBox(this.currentScene.skybox);
			this.currentScene = null;
			// gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			// Renderer.renderTexturedQuad(this.cbo);
		}
		renderEntity(entity){
			const model = entity.model;
			let transformationMatrix = createTransformationMatrix(entity.position,entity.rotation,entity.scale);
			
			this.shaders.staticShader.start();
			this.shaders.staticShader.linkTextures();
			this.shaders.staticShader.loadTransformationMatrix(transformationMatrix);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D,model.material.diffuseMap);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D,model.material.normalMap);
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D,model.material.metalnessMap);
			gl.activeTexture(gl.TEXTURE3);
			gl.bindTexture(gl.TEXTURE_2D,model.material.roughnessMap);
			gl.activeTexture(gl.TEXTURE4);
			gl.bindTexture(gl.TEXTURE_2D,model.material.occlusionMap);
			gl.activeTexture(gl.TEXTURE5);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP,this.currentScene.skybox.enviromentMap);
			gl.activeTexture(gl.TEXTURE6);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP,model.material.irradianceMap.textureID);
			gl.activeTexture(gl.TEXTURE7);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP,model.material.prefilteredMap.textureID);

			gl.bindVertexArray(model.vao);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
			gl.enableVertexAttribArray(0);
			gl.enableVertexAttribArray(1);
			gl.enableVertexAttribArray(2);
				gl.drawElements(gl.TRIANGLES, model.vertexCount, gl.UNSIGNED_SHORT, 0);
			gl.disableVertexAttribArray(0);
			gl.disableVertexAttribArray(1);
			gl.disableVertexAttribArray(2);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);
			gl.bindVertexArray(null);
		}
		renderTerrain(terrain){
			let model = terrain.model;
			let transformationMatrix = createTransformationMatrix(terrain.position,new Vector3f(0,0,0),1);
			
			this.shaders.terrainShader.start();
			this.shaders.terrainShader.linkTextures();
			this.shaders.terrainShader.loadTransformationMatrix(transformationMatrix);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D,model.material.diffuseMap);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D,model.material.normalMap);
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D,model.material.metalnessMap);
			gl.activeTexture(gl.TEXTURE3);
			gl.bindTexture(gl.TEXTURE_2D,model.material.roughnessMap);
			gl.activeTexture(gl.TEXTURE4);
			gl.bindTexture(gl.TEXTURE_2D,model.material.occlusionMap);
			gl.activeTexture(gl.TEXTURE5);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP,this.currentScene.skybox.enviromentMap);
			gl.activeTexture(gl.TEXTURE6);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP,model.material.irradianceMap.textureID);
			gl.activeTexture(gl.TEXTURE7);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP,model.material.prefilteredMap.textureID);

			gl.bindVertexArray(model.vao);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
			gl.enableVertexAttribArray(0);
			gl.enableVertexAttribArray(1);
			gl.enableVertexAttribArray(2);
				gl.drawElements(gl.TRIANGLES, model.vertexCount, gl.UNSIGNED_SHORT, 0);
			gl.disableVertexAttribArray(0);
			gl.disableVertexAttribArray(1);
			gl.disableVertexAttribArray(2);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);
			gl.bindVertexArray(null);
		}
		renderSkyBox(skybox){
			this.shaders.skyboxShader.start();
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.enviromentMap);

			gl.bindBuffer(gl.ARRAY_BUFFER, skybox.model.vertices);
			gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
		 	gl.enableVertexAttribArray(0);
			gl.drawArrays(gl.TRIANGLES, 0, skybox.model.vertexCount);
			gl.disableVertexAttribArray(0);
			gl.bindBuffer(gl.ARRAY_BUFFER,null);

			gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		}
		static renderCube(size){
			let model = new Cube(size);
			gl.bindBuffer(gl.ARRAY_BUFFER, model.vertices);
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(0);
			gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
			gl.disableVertexAttribArray(0);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}
		static renderTexturedQuad(texture){
			let model = {
				buffer: gl.createBuffer(),
				vertices: [
					-1, 1, -1, -1, 1, 1,
					1, 1, -1, -1, 1, -1
				],
				vertexCount: 6
			};
			let shader = new StaticShader(
				`#version 300 es
				in vec2 position;
				out vec2 textureCoords;
				void main(){
					textureCoords = (position + 1.0) / 2.0;
					gl_Position = vec4(position,0.0,1.0);
				}`,
				`#version 300 es
				precision mediump float;
				in vec2 textureCoords;
				out vec4 out_Color;
				uniform sampler2D image;
				void main(){
					out_Color = texture(image, textureCoords);
				}`
			);
			shader.bindAttribute(0,'position');
			shader.start();
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(0);
			gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
			gl.disableVertexAttribArray(0);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}
	}
	class VRRenderer extends Renderer{
		constructor(shaders){
			super(shaders);
			this.crosshairTexture = Loader.createTextureFromColor(new Vector3f(1));
			this.crosshairShader = new ShaderProgram(
					`#version 300 es
					in vec2 position;
					out vec2 textureCoords;
					void main(void){
						gl_Position = vec4(position,0.0,1.0);
						textureCoords = vec2((position.x+1.0)/2.0,1.0 - (position.y+1.0)/2.0);
					}`,
					`#version 300 es
					precision mediump float;
					out vec4 out_Color;
					in vec2 textureCoords;
					uniform sampler2D gui;
					void main(void){
						vec4 color = texture(gui,textureCoords);
						out_Color = vec4(1.0,1.0,1.0,1.0);
					}`
			);

			let vertices = [
				-10.0, 10.0,
				-10.0,-10.0,
				 10.0, 10.0,
				 10.0,-10.0
			];
			this.positions = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.positions);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}
		renderCrosshair(){
			// gl.enable(gl.BLEND);
			// gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

			// gl.useProgram(this.crosshairShader.programID);
			// gl.bindAttribLocation(this.crosshairShader.programID, 0, 'position');
			// gl.activeTexture(gl.TEXTURE0);
			// gl.bindTexture(gl.TEXTURE_2D, this.crosshairTexture);

			// gl.bindBuffer(gl.ARRAY_BUFFER, this.positions);
			// gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
		    
		    // gl.enableVertexAttribArray(0);
			// gl.drawArrays(gl.TRIANGLES_STRIP, 0, 4);
			// gl.disableVertexAttribArray(0);

			// gl.bindBuffer(gl.ARRAY_BUFFER, null);
			// gl.disable(gl.BLEND);
		}
		renderScene(scene,frameData){
			this.currentScene = scene;
			let negativeCameraPos = vec3.fromValues(-this.currentScene.camera.position.x,-this.currentScene.camera.position.y,-this.currentScene.camera.position.z);
			let leftViewMatrix = frameData.leftViewMatrix;
			let rightViewMatrix = frameData.rightViewMatrix;
			mat4.translate(leftViewMatrix,leftViewMatrix,negativeCameraPos);
			mat4.translate(rightViewMatrix,rightViewMatrix,negativeCameraPos);
			
			gl.viewport(0, 0, canvas.width * 0.5, canvas.height);
			this.shaders.staticShader.start();
			this.shaders.staticShader.loadLights(this.currentScene.lights);
			this.shaders.staticShader.loadProjectionMatrix(frameData.leftProjectionMatrix);
			this.shaders.staticShader.loadViewMatrix(leftViewMatrix);
			for(let entity of scene.entities){
				this.renderEntity(entity);
			}
			this.shaders.terrainShader.start();
			this.shaders.terrainShader.loadProjectionMatrix(frameData.leftProjectionMatrix);
			this.shaders.terrainShader.loadViewMatrix(leftViewMatrix);
			this.shaders.terrainShader.loadLights(this.currentScene.lights);
			for(let terrain of scene.terrains){
				this.renderTerrain(terrain);
			}
			this.shaders.skyboxShader.start();
			this.shaders.skyboxShader.loadProjectionMatrix(frameData.leftProjectionMatrix);
			this.shaders.skyboxShader.loadViewMatrix(leftViewMatrix);
			if(this.currentScene.skybox){
				this.renderSkyBox(scene.skybox);
			}

			gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
			this.shaders.staticShader.start();
			this.shaders.staticShader.loadProjectionMatrix(frameData.rightProjectionMatrix);
			this.shaders.staticShader.loadViewMatrix(rightViewMatrix);
			for(let entity of scene.entities){
				this.renderEntity(entity);
			}
			this.shaders.terrainShader.start();
			this.shaders.terrainShader.loadProjectionMatrix(frameData.rightProjectionMatrix);
			this.shaders.terrainShader.loadViewMatrix(rightViewMatrix);
			for(let terrain of scene.terrains){
				this.renderTerrain(terrain);
			}
			this.shaders.skyboxShader.start();
			this.shaders.skyboxShader.loadProjectionMatrix(frameData.rightProjectionMatrix);
			this.shaders.skyboxShader.loadViewMatrix(rightViewMatrix);
			if(this.currentScene.skybox){
				this.renderSkyBox(scene.skybox);
			}

			this.currentScene = null;
		}
	}

// Scene
	class Scene{
		constructor(){
			this.entities = [];
			this.terrains = [];
			this.lights = [];
			this.camera = new Camera();
			this.skybox = new Skybox(null);
			this.handlers = {
				skyboxUpdated:()=>{}
			};
		}
		on(event,callback){
			this.handlers[event] = callback
		}
		addEntity(entity){
			this.entities.push(entity);
		}
		addTerrain(terrain){
			this.terrains.push(terrain);
		}
		addLight(light){
			this.lights.push(light);
		}
		setSun(sun){
			this.sun = sun;
		}
		setSkybox(skybox){
			this.skybox = skybox;
			this.handlers['skyboxUpdated']();
		}
		setCamera(camera){
			this.camera = camera;
		}
	}

// Lights
	class PointLight {
		constructor(position, color, brightness){
			this.position = position;
			this.color = color || new Vector3f(1.0,1.0,1.0);
			this.brightness = brightness || 1.0;
		}
	}

// Enviroment
	class Skybox{
		constructor(textureID){
			this.model = new Cube(512);
			this.enviromentMap = textureID;
		}
	}
	class EnviromentMap{
		constructor(eqMap){
			this.res = 1024;
			this.fbo = gl.createFramebuffer();
			this.equitangularMap = eqMap || null;
			this.textureID = Loader.createEmptyEnviromentMap(this.res);
			this.views = [
				mat4.lookAt(mat4.create(),[0,0,0],[ 1, 0, 0],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[-1, 0, 0],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 1, 0],[0, 0, 1]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0,-1, 0],[0, 0,-1]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 0, 1],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 0,-1],[0,-1, 0])
			];
		}
		setEquitangularMap(texture) {
			this.equitangularMap = texture;
			this.prepare().then(() => this.compute);
		}
		prepare(){
			return new Promise(resolve => {
				if(!this.shader)
					fetchShader(
						"shaders/pbr-precompute/cubemap.vert",
						"shaders/pbr-precompute/enviroment/enviroment.frag"
					).then(data => {
						this.shader = new PBRPrecomputeShader(data.vertexSource, data.fragmentSource);
						resolve();
					});
				else resolve();
			});
		}
		compute(){
			let projectionMatrix = mat4.perspective(mat4.create(),Math.PI/2,1,0.1,10);
			this.shader.start();
			this.shader.loadProjectionMatrix(projectionMatrix);
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
			gl.viewport(0,0,this.res,this.res);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.equitangularMap);
			for(let i = 0;i < 6;i++){
				this.shader.loadViewMatrix(this.views[i]);
				gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,this.textureID,0);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				Renderer.renderCube(1);
			}
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.textureID);
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		}
	}
	class IrradianceMap {
		constructor(enviromentMap){
			this.res = 64;
			this.fbo = gl.createFramebuffer();
			this.enviromentMap = enviromentMap || null;
			this.textureID = Loader.createEmptyEnviromentMap(this.res);
			this.views = [
				mat4.lookAt(mat4.create(),[0,0,0],[ 1, 0, 0],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[-1, 0, 0],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 1, 0],[0, 0, 1]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0,-1, 0],[0, 0,-1]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 0, 1],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 0,-1],[0,-1, 0])
			];
		}
		setEnviromentMap(texture) {
			this.enviromentMap = texture;
			this.prepare().then(() => this.compute);
		}
		prepare(){
			return new Promise(resolve => {
				if (!this.shader)
					fetchShader(
						"shaders/pbr-precompute/cubemap.vert",
						"shaders/pbr-precompute/irradiance/irradiance.frag"
					).then(data => {
						this.shader = new PBRPrecomputeShader(data.vertexSource, data.fragmentSource);
						resolve();
					});
				else resolve();
			});
		}
		compute(){
			if(this.enviromentMap){
				let projectionMatrix = mat4.perspective(mat4.create(),Math.PI/2,1,0.1,10);
				this.shader.start();
				this.shader.loadProjectionMatrix(projectionMatrix);
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_CUBE_MAP,this.enviromentMap);
				gl.viewport(0,0,this.res,this.res);
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
				for(let i = 0;i < 6;i++){
					this.shader.loadViewMatrix(this.views[i]);
					gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,this.textureID,0);
					gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
					Renderer.renderCube(1);
				}
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			}
		}
	}
	class PrefilteredMap {
		constructor(enviromentMap) {
			this.res = 1024;
			this.fbo = gl.createFramebuffer();
			this.enviromentMap = enviromentMap || null;
			this.textureID = Loader.createEmptyEnviromentMap(this.res);
			this.mipLevels = 5;
			this.views = [
				mat4.lookAt(mat4.create(),[0,0,0],[ 1, 0, 0],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[-1, 0, 0],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 1, 0],[0, 0, 1]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0,-1, 0],[0, 0,-1]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 0, 1],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 0,-1],[0,-1, 0])
			];
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.textureID);
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		}
		setEnviromentMap(texture) {
			this.enviromentMap = texture;
			this.prepare().then(() => this.compute);
		}
		prepare() {
			return new Promise(resolve => {
				if (!this.shader)
					fetchShader(
						"shaders/pbr-precompute/cubemap.vert",
						"shaders/pbr-precompute/prefilter/prefilter.frag"
					).then(data => {
						this.shader = new PBRPrecomputeShader(data.vertexSource, data.fragmentSource);
						resolve();
					});
				else resolve();
			});
		}
		compute(){
			if(this.enviromentMap){
				let projectionMatrix = mat4.perspective(mat4.create(),Math.PI/2,1.0,0.1,10.0);
				this.shader.start();
				this.shader.loadProjectionMatrix(projectionMatrix);
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.enviromentMap);
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
				for(let mip = 0; mip < this.mipLevels; mip++){
					let size = this.res * Math.pow(0.5,mip);
					let roughness = mip / (this.mipLevels-1);
					this.shader.loadFloat(gl.getUniformLocation(this.shader.programID, 'roughness'),roughness);
					gl.viewport(0,0,size,size);
					for(let i = 0;i < 6;i++){
						this.shader.loadViewMatrix(this.views[i]);
						gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,this.textureID,mip);
						gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
						Renderer.renderCube(1);
					}
				}
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
			}
		}
	}
	class Terrain{
		constructor(gridX,gridZ){
			this.w = 1024;
			this.vertexCount = 128;
			this.x = gridX * this.w;
			this.z = gridZ * this.w;
			this.model = this.generate();

			this.position = new Vector3f(this.x,0,this.z);
			this.rotation = new Vector3f(0,0,0);
			this.scale = 1;
		}

		generate(){
			let count = this.vertexCount * this.vertexCount;
			let vertices = new Array(count);
			let normals  = new Array(count);
			let textureCoords = new Array(count);
			let indices = new Array(6 * (this.vertexCount - 1) * (this.vertexCount - 1));
			let vertexPointer = 0;
			for(let i = 0; i < this.vertexCount; i++){
				for(let j = 0; j  < this.vertexCount; j++){
					vertices[vertexPointer*3] = j / (this.vertexCount - 1) * this.w;
					vertices[vertexPointer*3+1] = 0;
					vertices[vertexPointer*3+2] = i / (this.vertexCount - 1) * this.w;
					normals[vertexPointer*3] = 0;
					normals[vertexPointer*3+1] = 1;
					normals[vertexPointer*3+2] = 0;
					textureCoords[vertexPointer*2] = j / (this.vertexCount - 1);
					textureCoords[vertexPointer*2+1] = i / (this.vertexCount - 1);
					vertexPointer++;
				}
			}
			let pointer = 0;
			for(let gz = 0; gz < this.vertexCount-1; gz++){
				for(let gx = 0; gx < this.vertexCount-1; gx++){
					let topLeft = (gz * this.vertexCount) + gx;
					let topRight = topLeft + 1;
					let bottomLeft = ((gz+1) * this.vertexCount) + gx;
					let bottomRight = bottomLeft + 1;
					indices[pointer++] = topLeft;
					indices[pointer++] = bottomLeft;
					indices[pointer++] = topRight;
					indices[pointer++] = topRight;
					indices[pointer++] = bottomLeft;
					indices[pointer++] = bottomRight;
				}
			}
			return loader.createModel(vertices,indices,textureCoords,normals);
		}
	}

// Entities
	class Material {
		constructor(diffuseMap,normalMap,metalnessMap,roughnessMap,occlusionMap){			
			this.diffuseMap   = diffuseMap   || Loader.createTextureFromColor(new Vector3f(0.8, 0.8, 0.8));
			this.normalMap    = normalMap    || Loader.createTextureFromColor(new Vector3f(0.5, 0.5, 1.0));
			this.metalnessMap = metalnessMap || Loader.createTextureFromColor(new Vector3f(0.0, 0.0, 0.0));
			this.roughnessMap = roughnessMap || Loader.createTextureFromColor(new Vector3f(0.0, 0.0, 0.0));
			this.occlusionMap = occlusionMap || Loader.createTextureFromColor(new Vector3f(1.0, 1.0, 1.0));
			this.irradianceMap = new IrradianceMap();
			this.prefilteredMap = new PrefilteredMap();
		}
		setIrradianceMap(texture){
			if (texture) this.irradianceMap = texture;
		}
		setPrefilteredMap(texture){
			if (texture) this.prefilteredMap = texture;
		}
		setDiffuseMap(texture){
			if (texture) this.diffuseMap = texture;
		}
		setNormalMap(texture){
			if (texture) this.normalMap = texture;
		}
		setMetalnessMap(texture){
			if (texture) this.metalnessMap = texture;
		}
		setRoughnessMap(texture){
			if (texture) this.roughnessMap = texture;
		}
		setOcclusionMap(texture){
			if (texture) this.occlusionMap = texture;
		}
	}
	class Model {
		constructor(id,vao,indexBuffer,vertexCount){
			this.id = id;
			this.vao = vao;
			this.indexBuffer = indexBuffer;
			this.vertexCount = vertexCount || 0;
			this.material = new Material();
		}
		setMaterial(material){
			this.material = material;
		}
		copy(){
			return new Model(this.id,this.vao,this.indexBuffer,this.vertexCount);
		}
	}
	class Entity {
		constructor(model,position,rotation,scale){
			this.model = model;
			this.position = position;
			this.rotation = rotation;
			this.velocity = new Vector3f();
			this.acceleration = new Vector3f();
			this.scale = scale;
		}
		collide(target){
			let dist = Math.abs(Math.sqrt(
				Math.pow(this.position.x - target.position.x,2) +
				Math.pow(this.position.y - target.position.y,2) +
				Math.pow(this.position.z - target.position.z,2)
			));
			return dist <= Math.abs(this.velocity.y + this.acceleration.y);
		}
		setPosition(vec){
			this.position.x = vec.x;
			this.position.y = vec.y;
			this.position.z = vec.z;
		}
		getPosition(){
			return new Vector3f(this.position.x,this.position.y,this.position.z);
		}
		setRotation(vec){
			this.rotation.x = vec.x;
			this.rotation.y = vec.y;
			this.rotation.z = vec.z;
		}
		getRotation(){
			return new Vector3f(this.rotation.x,this.rotation.y,this.rotation.z);
		}
		increasePosition(dx,dy,dz){
			this.position.x += dx;
			this.position.y += dy;
			this.position.z += dz;
		}
		increaseRotation(dx,dy,dz){
			this.rotation.x += dx;
			this.rotation.y += dy;
			this.rotation.z += dz;
		}
	}
	class Camera{
		constructor(anchor){
			this.position = new Vector3f(0,0,0);
			this.rotation = new Vector3f(0,0,0);
			this.anchor = anchor || null;
			if(this.anchor)this.anchor.camera = this;
		}
		update(){
			if(this.anchor){
				this.position.x = this.anchor.anchorPoint.x;
				this.position.y = this.anchor.anchorPoint.y;
				this.position.z = this.anchor.anchorPoint.z;
				this.rotation.x = this.anchor.rotation.x;
				this.rotation.y = this.anchor.rotation.y;
				this.rotation.z = this.anchor.rotation.z;
			}
		}
		setViewAnchor(entity){
			this.anchor = entity;
			entity.camera = this;
		}
		getPosition(){
			return this.position.copy();
		}
		setPosition(vec){
			this.position = new Vector3f(vec.x,vec.y,vec.z);
		}
		getRotation(){
			return this.rotation.copy();
		}
		setRotation(vec){
			this.rotation = new Vector3f(vec.x,vec.y,vec.z);
		}
	}
	class Player {
		constructor(x,y,z){
			this.position = new Vector3f(x,y,z);
			this.rotation = new Vector3f(0,0,0);
			this.velocity = new Vector3f();
			this.acceleration = new Vector3f();
			this.anchorPoint = new Vector3f(x,y+5,z);

			this.crouched = false;
			this.viewHeight = 5
			this.crouchHeight = 3.5;

			this.movementSpeed = 100;
			this.speedMtl = 1;

			this.direction = {x:0,y:0};
		}
		applyForce(vec){
			this.acceleration.add(vec);
		}
		input(){
			this.direction.x = input.movementAxes.x;
			this.direction.y = input.movementAxes.y;

			this.rotation.y += input.viewAxes.y * input.sensivity * Math.PI / 360;
			this.rotation.x += input.viewAxes.x * input.sensivity * Math.PI / 360;

			if (this.rotation.x < -Math.PI / 3)
				this.rotation.x = -Math.PI / 3;
			else if (this.rotation.x > Math.PI / 3)
				this.rotation.x = Math.PI / 3;

			if(keyboard.getKey('ShiftLeft').pressed){
				this.speedMtl = 2;
			} else {
				this.speedMtl = 1;
			}
			if((keyboard.getKey('Space').touched || gamepad.buttons['cross'].touched) && this.position.y == 0){
				if(this.crouched)this.crouched = false;
				else this.applyForce(new Vector3f(0,100,0));
			}
			if(gamepad.buttons['L3'].touched){
				this.speedMtl = this.speedMtl == 2 ? 1 : 2;
			}
			if((gamepad.buttons['circle'].touched || keyboard.getKey('ControlLeft').touched)&& this.position.y == 0){
				this.crouched = !this.crouched;
			}
		}
		update(){
			this.input();
			let distanceSide = this.direction.x * display.getFrameTime();
			let distanceForward = this.direction.y * display.getFrameTime();
			let xOff = distanceForward * Math.sin(-this.camera.rotation.y) + distanceSide * Math.sin(-this.camera.rotation.y + Math.PI/2);
			let zOff = distanceForward * Math.cos(-this.camera.rotation.y) + distanceSide * Math.cos(-this.camera.rotation.y + Math.PI/2);
			// Input force
			this.applyForce(new Vector3f(xOff,0,zOff).mult(this.movementSpeed * this.speedMtl));

			// Gravity force
			this.applyForce(new Vector3f(0,-GRAVITY,0));
			if(this.velocity.y < 0)
				this.applyForce(new Vector3f(0,this.velocity.y**2*2,0));

			// Friction Damping
			this.applyForce(new Vector3f(-this.velocity.x,0,-this.velocity.z).mult(7.5));

			this.velocity.add(this.acceleration.mult(1/60));
			this.position.add(this.velocity);
			this.acceleration.mult(0);

			if(this.position.y < 0.1){
				this.acceleration.y = 0;
				this.velocity.y = 0;
				this.position.y = 0;
			}

			this.anchorPoint.x = this.position.x;
			this.anchorPoint.z = this.position.z;
			if(this.crouched){
				this.anchorPoint.y += ((this.position.y + this.crouchHeight) - this.anchorPoint.y) * 0.1;
			} else {
				if(this.position.y == 0) {
					this.anchorPoint.y += ((this.position.y + this.viewHeight) - this.anchorPoint.y) * 0.1;
				} else {
					this.anchorPoint.y = this.position.y + this.viewHeight;
				}
			}
		}
		getPosition(){
			return this.position.copy();
		}
		setPosition(vec){
			this.position = new Vector3f(vec.x,vec.y,vec.z);
		}
		getRotation(){
			return this.rotation.copy();
		}
		setRotation(vec){
			this.rotation = new Vector3f(vec.x,vec.y,vec.z);
		}
	}
