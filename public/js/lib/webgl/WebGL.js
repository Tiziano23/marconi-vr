"use strict";
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

class Vector3f {
	constructor(x, y, z) {
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
		if (x) {
			if (typeof x == 'object' && (x instanceof Array || x instanceof Uint8Array)) {
				this.x = x[0];
				this.y = x[1];
				this.z = x[2];
			} else if (typeof x == 'object' && x instanceof Vector3f) {
				this.x = x.x;
				this.y = x.y;
				this.z = x.z;
			}
		}
	}
	add(vec) {
		this.x += vec.x;
		this.y += vec.y;
		this.z += vec.z;
		return this;
	}
	sub(vec) {
		this.x -= vec.x;
		this.y -= vec.y;
		this.z -= vec.z;
		return this;
	}
	mult(scl) {
		this.x *= scl;
		this.y *= scl;
		this.z *= scl;
		return this;
	}
	pow(fac) {
		this.x = Math.pow(this.x, fac);
		this.y = Math.pow(this.y, fac);
		this.z = Math.pow(this.z, fac);
		return this;
	}
	set(x, y, z) {
		if (typeof x == 'object' && x instanceof Vector3f) {
			this.x = arguments[0].x;
			this.y = arguments[0].y;
			this.z = arguments[0].z;
		} else {
			this.x = x == 0 ? x : (x || this.x);
			this.y = y == 0 ? y : (y || this.y);
			this.z = z == 0 ? z : (z || this.z);
			return this;
		}
	}
	setX(x) {
		this.x = x == 0 ? x : (x || this.x);
		return this;
	}
	setY(y) {
		this.y = y == 0 ? y : (y || this.y);
		return this;
	}
	setZ(z) {
		this.z = z == 0 ? z : (z || this.z);
		return this;
	}
	flipX() {
		this.x *= -1;
		return this;
	}
	flipY() {
		this.y *= -1;
		return this;
	}
	flipZ() {
		this.z *= -1;
		return this;
	}
	limit(max) {
		if (this.length() > max) this.normalize().mult(max);
		return this;
	}
	normalize() {
		let mag = this.length();
		this.mult(1/mag);
		return this;
	}
	length(){
		return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
	}
	applyQuaternion(q) {
		var x = this.x, y = this.y, z = this.z;
		var qx = q.x, qy = q.y, qz = q.z, qw = q.w;
		// calculate quat * vector
		var ix = qw * x + qy * z - qz * y;
		var iy = qw * y + qz * x - qx * z;
		var iz = qw * z + qx * y - qy * x;
		var iw = - qx * x - qy * y - qz * z;
		// calculate result * inverse quat
		this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
		this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
		this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;
		return this;
	}

	arr() {
		return [this.x, this.y, this.z];
	}
	copy() {
		return new Vector3f(this.x, this.y, this.z);
	}
	toString() {
		return `Vector3f {x:${this.x}, y:${this.y}, z:${this.z}}`;
	}

	static lerp(a,b,t){
		if (t == 0) return a.copy();
		if (t == 1) return b.copy();
		let result = new Vector3f();
		result.x = ((1 - t) * a.x) + (t * b.x);
		result.y = ((1 - t) * a.y) + (t * b.y);
		result.z = ((1 - t) * a.z) + (t * b.z);
		return result;
	}
}
class Quaternion {
	constructor(x, y, z, w) {
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
		this.w = w || 1;
		if (x) {
			if (x[0] == 0 ? true : x[0]) {
				this.x = x[0];
				this.y = x[1];
				this.z = x[2];
				this.w = x[3];
			}
		}
	}
	set(x, y, z, w) {
		if (typeof x == 'object' && x instanceof Vector3f) {
			this.x = arguments[0].x;
			this.y = arguments[0].y;
			this.z = arguments[0].z;
			this.w = arguments[0].w;
		} else {
			this.x = x == 0 ? x : (x || this.x);
			this.y = y == 0 ? y : (y || this.y);
			this.z = z == 0 ? z : (z || this.z);
			this.w = w == 0 ? w : (w || this.w);
		}
		return this;
	}
	mult(r) {
		let qw = this.w, qx = this.x, qy = this.y, qz = this.z;
		this.w = (r.w * qw - r.x * qx - r.y * qy - r.z * qz);
		this.x = (r.w * qx - r.x * qw - r.y * qz - r.z * qy);
		this.y = (r.w * qy - r.x * qz - r.y * qw - r.z * qx);
		this.z = (r.w * qz - r.x * qy - r.y * qx - r.z * qw);
		this.normalize();
		return this;
	}
	normalize() {
		let mag = this.length();
		this.x /= mag;
		this.y /= mag;
		this.z /= mag;
		this.w /= mag;
		return this;
	}
	length() {
		return Math.sqrt(this.x**2 + this.y**2 + this.z**2 + this.w**2);
	}
	toEulerAngles(){
		let yaw = Math.asin(2 * (this.w * this.y - this.z * this.x));
		let roll = Math.atan2(2 * (this.w * this.z + this.x * this.y), 1 - 2 * (this.y * this.y + this.z * this.z));
		let pitch = Math.atan2(2 * (this.w * this.x + this.y * this.z), 1 - 2 * (this.x * this.x + this.y * this.y));
		return new Vector3f(pitch,yaw,roll);
	}

	arr() {
		return [this.x, this.y, this.z, this.w];
	}
	copy() {
		return new Quaternion(this.x, this.y, this.z, this.w);
	}
	toString() {
		return `Quaternion {x:${this.x}, y:${this.y}, z:${this.z}, w:${this.w}}`;
	}

	static fromAxisAngle(x,y,z,a){
		let f = Math.sin(a / 2.0);
		let xx = x * f;
		let yy = y * f;
		let zz = z * f;
		let w = Math.cos(a / 2.0);
		return new Quaternion(xx, yy, zz, w).normalize();
	}
	static lerp(a, b, t) {
		if (t == 0) return a.copy();
		if (t == 1) return b.copy();
		let result = new Quaternion();
		result.x = ((1 - t) * a.x) + (t * b.x);
		result.y = ((1 - t) * a.y) + (t * b.y);
		result.z = ((1 - t) * a.z) + (t * b.z);
		result.w = ((1 - t) * a.w) + (t * b.w);
		return result;
	}
}
class Color {
	constructor(r,g,b,a){
		this.r = r || 0;
		this.g = g || 0;
		this.b = b || 0;
		this.a = a || 1;
		if (r) {
			if (r[0] == 0 ? true : r[0]) {
				this.r = r[0];
				this.g = r[1];
				this.b = r[2];
				this.a = r[3];
			}
		}
	}
	set(r,g,b,a) {
		this.r = r == 0 ? r : (r || this.r);
		this.g = g == 0 ? g : (g || this.g);
		this.b = b == 0 ? b : (b || this.b);
		this.a = a == 0 ? a : (a || this.a);
		return this;
	}
	setR(r){
		this.r = r == 0 ? r : (r || this.r);
		return this;
	}
	setG(g) {
		this.g = g == 0 ? g : (g || this.r);
		return this;
	}
	setB(b) {
		this.b = b == 0 ? b : (b || this.r);
		return this;
	}
	setA(a) {
		this.a = a == 0 ? a : (a || this.r);
		return this;
	}
	toUnsignedInt(){
		this.r *= 255;
		this.g *= 255;
		this.b *= 255;
		this.a *= 255;
	}
	applyGamma(y){
		this.r = Math.pow(this.r, 1 / y);
		this.g = Math.pow(this.g, 1 / y);
		this.b = Math.pow(this.b, 1 / y);
		return this;
	}
	copy() {
		return new Color(this.r, this.g, this.b, this.a);
	}
	toString() {
		return `Color {r:${this.r}, g:${this.g}, b:${this.b}, a:${this.a}}`;
	}
	static mix(a,b,fac){
		if (fac == 0) return a.copy();
		else if (fac == 1) return b.copy();
		else {
			let result = new Color();
			result.r = ((1 - fac) * a.r) + (fac * b.r);
			result.g = ((1 - fac) * a.g) + (fac * b.g);
			result.b = ((1 - fac) * a.b) + (fac * b.b);
			return result;
		}
	}
}

class Texture {
	constructor(arg1) {
		this.id = gl.createTexture();
		this.width = 1;
		this.height = 1;
		this.ready = true;
		gl.bindTexture(gl.TEXTURE_2D, this.id);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		if (gl.getExtension('EXT_texture_filter_anisotropic')) {
			let ext = gl.getExtension('EXT_texture_filter_anisotropic');
			let amount = Math.min(4, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
			gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, amount);
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
		if (typeof arg1 == 'string') {
			this.loadImageUrl(arg1);
		} else if (typeof arg1 == 'object' && arg1 instanceof Uint8Array) {
			this.loadImageData(arg1);
		}
	}
	loadImageData(data, options) {
		this.width = Math.sqrt(data.length / 4);
		this.height = Math.sqrt(data.length / 4);
		gl.bindTexture(gl.TEXTURE_2D, this.id);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
		if (options.noMips) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.generateMipmap(gl.TEXTURE_2D);
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
	async loadImageUrl(url) {
		this.ready = false;
		return new Promise((resolve, error) => {
			let img = new Image();
			img.src = url;
			img.onload = () => {
				this.width = img.width;
				this.height = img.height;
				gl.bindTexture(gl.TEXTURE_2D, this.id);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.bindTexture(gl.TEXTURE_2D, null);
				this.ready = true;
				resolve();
			}
			img.onerror = e => {
				error(e);
			}
		})
	}
	static fromColor(c) {
		let texture = new Texture();
		gl.bindTexture(gl.TEXTURE_2D, texture.id);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255 * c.r, 255 * c.g, 255 * c.b, 255 * c.a]));
		gl.bindTexture(gl.TEXTURE_2D, null);
		return texture;
	}
}
class Cube {
	constructor(size) {
		let model = [];
		for (let i = 0; i < CUBE.length; i++) model[i] = CUBE[i] * size;
		this.vertexCount = CUBE.length / 3;
		this.vertices = gl.createBuffer(gl.ARRAY_BUFFER);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}
}

class Loader {
	static storeDataInVao(index, size, data) {
		let buff = gl.createBuffer(gl.ARRAY_BUFFER);
		gl.bindBuffer(gl.ARRAY_BUFFER, buff);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
		gl.vertexAttribPointer(index, size, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}
	static createIndexBuffer(data) {
		let buff = gl.createBuffer(gl.ELEMENT_ARRAY_BUFFER);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buff);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		return buff;
	}

	static loadObj(id, path) {
		return new Promise((resolve,error) => {
			fetch(path).then(res => {
				const td = new TextDecoder('utf-8');
				const reader = res.body.getReader();
				let file = "";
				reader.read()
					.then(function readChunk(buffer) {
						if (buffer.done) return file;
						file += td.decode(buffer.value);
						return reader.read().then(readChunk);
					})
					.then(file => {
						file = file.trim() + '\n';
						const lines = file.split('\n');
						let vertices = new Array();
						let textures = new Array();
						let normals = new Array();
						let indices = new Array();
						let sortedVertices = new Array();
						let sortedTextures = new Array();
						let sortedNormals = new Array();
						let sortedIndices = new Array();
						let indexMap = new Array();
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
						});
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
								if (currentTexture)
									sortedTextures.push(currentTexture[0], 1 - currentTexture[1]);
								if (currentNormal)
									sortedNormals.push(currentNormal[0], currentNormal[1], currentNormal[2]);
							}
						}
						let attributes = [
							{size:3,data:sortedVertices},
							{size:2,data:sortedTextures},
							{size:3,data:sortedNormals}
						];
						let primitive = new Primitive(attributes,{data:sortedIndices},sortedIndices.length);
						resolve(new Mesh(id,[primitive]));
					})
					.catch(e => {
						console.error(e)
						error(e);
					});
			}).catch(e => {
				console.error(e);
				error(e);
			});
		});
	}
	static loadShader(vertexUrl, fragmentUrl) {
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
			resolve({
				vertexSource,
				fragmentSource
			});
		});
	}
	static loadEnviromentMapHDR(textureUrl) {
		return new Promise(resolve => {
			const textureID = gl.createTexture();
			let img = new HDRImage();
			img.onload = function () {
				gl.bindTexture(gl.TEXTURE_2D, textureID);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img.dataRGBE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.bindTexture(gl.TEXTURE_2D, null);
				let eqMap = new EquitangularMap(img.width, image.height);
				eqMap.loadImage(textureID).then(() => resolve(eqMap));
			};
			img.src = textureUrl;
		})
	}
	
	static createEmptyCubeMap(resolution) {
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
		let enviromentMap = new CubeMap(resolution);
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
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, enviromentMap.textureID, 0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.bindBuffer(gl.ARRAY_BUFFER, model.vertices);
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(0);
			gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
			gl.disableVertexAttribArray(0);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		return enviromentMap;
	}
	static createEnviromentMapFromScene(resolution, scene, position, shader){
		let cubemap = new CubeMap(resolution);
		let projectionMatrix = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.01, 200);
		let views = [
			mat4.lookAt(mat4.create(), position.arr(), position.copy().add(new Vector3f( 1, 0, 0)).arr(), [0,-1, 0]),
			mat4.lookAt(mat4.create(), position.arr(), position.copy().add(new Vector3f(-1, 0, 0)).arr(), [0,-1, 0]),
			mat4.lookAt(mat4.create(), position.arr(), position.copy().add(new Vector3f( 0, 1, 0)).arr(), [0, 0, 1]),
			mat4.lookAt(mat4.create(), position.arr(), position.copy().add(new Vector3f( 0,-1, 0)).arr(), [0, 0,-1]),
			mat4.lookAt(mat4.create(), position.arr(), position.copy().add(new Vector3f( 0, 0, 1)).arr(), [0,-1, 0]),
			mat4.lookAt(mat4.create(), position.arr(), position.copy().add(new Vector3f( 0, 0,-1)).arr(), [0,-1, 0])
		];
		let fbo = gl.createFramebuffer();
		let dbo = gl.createRenderbuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		gl.bindRenderbuffer(gl.RENDERBUFFER, dbo);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, resolution, resolution);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dbo);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		shader.start();
		shader.loadLights(scene.lights);
		shader.loadProjectionMatrix(projectionMatrix);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.viewport(0, 0, resolution, resolution);
		for (let i = 0; i < 6; i++) {
			shader.loadViewMatrix(views[i]);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, cubemap.textureID, 0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			for(let e of scene.entities) {
				shader.linkTextures();
				shader.loadTransformationMatrix(e.getModelMatrix());
				for (let p of e.mesh.primitives) {
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, p.material.diffuseMap.id);
					gl.activeTexture(gl.TEXTURE1);
					gl.bindTexture(gl.TEXTURE_2D, p.material.metalnessMap.id);
					gl.activeTexture(gl.TEXTURE2);
					gl.bindTexture(gl.TEXTURE_2D, p.material.roughnessMap.id);
					gl.activeTexture(gl.TEXTURE3);
					gl.bindTexture(gl.TEXTURE_2D, p.material.occlusionMap.id);
					gl.bindVertexArray(p.vao);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.indexBuffer);
					for (let i of p.usedAttributes)
						gl.enableVertexAttribArray(i);
					gl.drawElements(gl.TRIANGLES, p.vertexCount, gl.UNSIGNED_SHORT, 0);
					for (let i of p.usedAttributes)
						gl.disableVertexAttribArray(i);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
					gl.bindVertexArray(null);
				}
			}
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.deleteRenderbuffer(dbo);
		gl.deleteFramebuffer(fbo);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemap.textureID);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		return cubemap;
	}

	static createViewMatrix(camera) {
		let matrix = mat4.create();
		mat4.fromRotationTranslationScaleOrigin(matrix, camera.orientation.arr(), camera.position.copy().mult(-1).arr(), [1,1,1], camera.position.arr());
		return matrix;
	}
	static createProjectionMatrix(fov, aspectRatio, zNear, zFar) {
		let matrix = mat4.create();
		mat4.perspective(matrix, fov, aspectRatio, zNear, zFar);
		return matrix;
	}
}

// Shaders
	class ShaderProgram {
		constructor(vertexSource,fragmentSource){
			this.vertexShader = this.compileShader(vertexSource, gl.VERTEX_SHADER);
			this.fragmentShader = this.compileShader(fragmentSource, gl.FRAGMENT_SHADER);
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
		compileShader(source, type){
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
			super.bindAttribute(0, 'position');
			super.bindAttribute(1, 'texture');
			super.bindAttribute(2, 'normal');
			super.bindAttribute(3, 'tangent');
		}
		getAllUniformLocations(){
			this.location_viewMatrix = super.getUniformLocation('viewMatrix');
			this.location_projectionMatrix = super.getUniformLocation('projectionMatrix');
			this.location_transformationMatrix = super.getUniformLocation('transformationMatrix');
			this.location_material = {
				normalMap:super.getUniformLocation('material.normalMap'),
				diffuseMap:super.getUniformLocation('material.diffuseMap'),
				metalnessMap:super.getUniformLocation('material.metalnessMap'),
				roughnessMap:super.getUniformLocation('material.roughnessMap'),
				occlusionMap:super.getUniformLocation('material.occlusionMap')
			};
			this.location_pbr = {
				enviroment:super.getUniformLocation('pbr.enviroment'),
				irradiance:super.getUniformLocation('pbr.irradiance'),
				prefiltered:super.getUniformLocation('pbr.prefiltered')
			};
			this.location_lights = [];
			for(let i = 0;i < 20;i++){
				this.location_lights[i] = {
					color:super.getUniformLocation('lights['+i+'].color'),
					position: super.getUniformLocation('lights['+i+'].position'),
					brightness:super.getUniformLocation('lights['+i+'].brightness')
				};
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
			for (let i in lights) {
				if (i <= 20) {
					super.loadVector(this.location_lights[i].color, lights[i].color);
					super.loadVector(this.location_lights[i].position, lights[i].position);
					super.loadFloat(this.location_lights[i].brightness, lights[i].brightness);
				}
			}
		}
		
		loadViewMatrix(matrix) {
			super.loadMatrix(this.location_viewMatrix, matrix);
		}
		loadProjectionMatrix(matrix){
			super.loadMatrix(this.location_projectionMatrix,matrix);
		}
		loadTransformationMatrix(matrix) {
			super.loadMatrix(this.location_transformationMatrix, matrix);
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
		loadViewMatrix(matrix) {
			matrix[12] = 0;
			matrix[13] = 0;
			matrix[14] = 0;
			super.loadMatrix(this.location_viewMatrix, matrix);
		}
		loadProjectionMatrix(matrix){
			super.loadMatrix(this.location_projectionMatrix,matrix);
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
		loadViewMatrix(matrix) {
			matrix[12] = 0;
			matrix[13] = 0;
			matrix[14] = 0;
			super.loadMatrix(this.location_viewMatrix, matrix);
		}
		loadProjectionMatrix(matrix){
			super.loadMatrix(this.location_projectionMatrix,matrix);
		}
	}
	class SceneEnviromentShader extends ShaderProgram {
		constructor(vertexSource, fragmentSource){
			super(vertexSource, fragmentSource);
		}
		bindAttributes() {
			super.bindAttribute(0, 'position');
			super.bindAttribute(1, 'texture');
			super.bindAttribute(2, 'normal');
		}
		getAllUniformLocations() {
			this.location_viewMatrix = super.getUniformLocation('viewMatrix');
			this.location_projectionMatrix = super.getUniformLocation('projectionMatrix');
			this.location_transformationMatrix = super.getUniformLocation('transformationMatrix');
			this.location_material = {
				diffuseMap: super.getUniformLocation('material.diffuseMap'),
				metalnessMap: super.getUniformLocation('material.metalnessMap'),
				roughnessMap: super.getUniformLocation('material.roughnessMap'),
				occlusionMap: super.getUniformLocation('material.occlusionMap')
			};
			this.location_lights = [];
			for (let i = 0; i < 20; i++) {
				this.location_lights[i] = {
					color: super.getUniformLocation('lights[' + i + '].color'),
					position: super.getUniformLocation('lights[' + i + '].position'),
					brightness: super.getUniformLocation('lights[' + i + '].brightness')
				};
			}
		}
		linkTextures() {
			super.loadInt(this.location_material.diffuseMap, 0);
			super.loadInt(this.location_material.metalnessMap, 1);
			super.loadInt(this.location_material.roughnessMap, 2);
			super.loadInt(this.location_material.occlusionMap, 3);
		}
		loadLights(lights) {
			for (let i in lights) {
				if (i <= 20) {
					super.loadVector(this.location_lights[i].color, lights[i].color);
					super.loadVector(this.location_lights[i].position, lights[i].position);
					super.loadFloat(this.location_lights[i].brightness, lights[i].brightness);
				}
			}
		}
		loadViewMatrix(matrix) {
			super.loadMatrix(this.location_viewMatrix, matrix);
		}
		loadProjectionMatrix(matrix) {
			super.loadMatrix(this.location_projectionMatrix, matrix);
		}
		loadTransformationMatrix(matrix) {
			super.loadMatrix(this.location_transformationMatrix, matrix);
		}
	}

// Renderers
	class Renderer {
		constructor(shaders){
			this.shaders = shaders;
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
			this.projectionMatrix = Loader.createProjectionMatrix(this.FOV,canvas.width/canvas.height,this.NEAR_PLANE,this.FAR_PLANE);
			for (let i in this.shaders) {
				this.shaders[i].start();
				this.shaders[i].loadProjectionMatrix(this.projectionMatrix);
			}
			gl.useProgram(null);
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
			
			let viewMatrix = Loader.createViewMatrix(scene.camera);
			
			this.shaders.staticShader.start();
			this.shaders.staticShader.loadLights(scene.lights);
			this.shaders.staticShader.loadViewMatrix(viewMatrix);
			for(let e of scene.entities){
				this.renderEntity(e);
			}

			this.shaders.skyboxShader.start();
			this.shaders.skyboxShader.loadViewMatrix(viewMatrix);
			if (scene.skybox) {
				this.renderSkyBox(scene.skybox);
			}
			
			this.currentScene = null;
			// gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			// Renderer.renderTexturedQuad(this.cbo);
		}
		renderEntity(entity, modelMarix){
			let transformationMatrix = modelMarix || entity.getModelMatrix();
			this.shaders.staticShader.start();
			this.shaders.staticShader.linkTextures();
			this.shaders.staticShader.loadTransformationMatrix(transformationMatrix);
			for (let p of entity.mesh.primitives) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, p.material.diffuseMap.id);
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, p.material.normalMap.id);
				gl.activeTexture(gl.TEXTURE2);
				gl.bindTexture(gl.TEXTURE_2D, p.material.metalnessMap.id);
				gl.activeTexture(gl.TEXTURE3);
				gl.bindTexture(gl.TEXTURE_2D, p.material.roughnessMap.id);
				gl.activeTexture(gl.TEXTURE4);
				gl.bindTexture(gl.TEXTURE_2D, p.material.occlusionMap.id);
				gl.activeTexture(gl.TEXTURE5);
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.currentScene.skybox.textureID);
				gl.activeTexture(gl.TEXTURE6);
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, p.material.irradianceMap.textureID);
				gl.activeTexture(gl.TEXTURE7);
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, p.material.prefilteredMap.textureID);
				gl.bindVertexArray(p.vao);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.indexBuffer);
				for (let i of p.usedAttributes)
					gl.enableVertexAttribArray(i);
				gl.drawElements(gl.TRIANGLES, p.vertexCount, gl.UNSIGNED_SHORT, 0);
				for (let i of p.usedAttributes)
					gl.disableVertexAttribArray(i);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);
				gl.bindVertexArray(null);
			}
		}
		renderSkyBox(skybox){
			this.shaders.skyboxShader.start();
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.textureID);

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
		}
		renderScene(scene,hmd){
			this.currentScene = scene;
			let invertedSTST = mat4.create();
			let negativeCameraPos = scene.camera.getPosition().setY(0).mult(-1).arr();
			mat4.invert(invertedSTST, hmd.sittingToStandingTransform);			
			mat4.multiply(hmd.frameData.leftViewMatrix, hmd.frameData.leftViewMatrix, invertedSTST);
			mat4.multiply(hmd.frameData.rightViewMatrix, hmd.frameData.rightViewMatrix, invertedSTST);
			mat4.translate(hmd.frameData.leftViewMatrix, hmd.frameData.leftViewMatrix, negativeCameraPos);
			mat4.translate(hmd.frameData.rightViewMatrix, hmd.frameData.rightViewMatrix, negativeCameraPos);

			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			// -- Left Eye Render -- //
			gl.viewport(0, 0, canvas.width * 0.5, canvas.height);
			this.shaders.staticShader.start();
			this.shaders.staticShader.loadLights(scene.lights);
			this.shaders.staticShader.loadViewMatrix(hmd.frameData.leftViewMatrix);
			this.shaders.staticShader.loadProjectionMatrix(hmd.frameData.leftProjectionMatrix);
			for(let e of scene.entities){
				this.renderEntity(e);
			}
			for (let c of hmd.controllers) {
				this.renderEntity(c.entity, c.poseMatrix);
			}
			this.shaders.skyboxShader.start();
			this.shaders.skyboxShader.loadViewMatrix(hmd.frameData.leftViewMatrix);
			this.shaders.skyboxShader.loadProjectionMatrix(hmd.frameData.leftProjectionMatrix);
			if (scene.skybox) {
				this.renderSkyBox(scene.skybox);
			}

			// -- Rigth Eye Render -- //
			gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
			this.shaders.staticShader.start();
			this.shaders.staticShader.loadLights(scene.lights);
			this.shaders.staticShader.loadViewMatrix(hmd.frameData.rightViewMatrix);
			this.shaders.staticShader.loadProjectionMatrix(hmd.frameData.rightProjectionMatrix);
			for(let e of scene.entities){
				this.renderEntity(e);
			}
			for (let c of hmd.controllers) {
				this.renderEntity(c.entity, c.poseMatrix);
			}
			this.shaders.skyboxShader.start();
			this.shaders.skyboxShader.loadViewMatrix(hmd.frameData.rightViewMatrix);
			this.shaders.skyboxShader.loadProjectionMatrix(hmd.frameData.rightProjectionMatrix);
			if(this.currentScene.skybox){
				this.renderSkyBox(scene.skybox);
			}

			this.currentScene = null;
		}
	}
	Renderer.prototype.FOV = 60 * (Math.PI / 180);
	Renderer.prototype.FAR_PLANE = 250;
	Renderer.prototype.NEAR_PLANE = 0.01;

// Scene
	class Scene{
		constructor(){
			this.lights = [];
			this.entities = [];
			this.camera = new Camera();
			this.skybox = new Skybox();
			this.irradianceMap = new IrradianceMap();
			this.prefilteredMap = new PrefilteredMap();
			this.handlers = {
				skyboxUpdated:()=>{}
			};
			this.irradianceMap.prepare();
			this.prefilteredMap.prepare();
		}
		on(event,callback){
			this.handlers[event] = callback
		}
		addEntity(entity){
			entity.mesh.setIrradianceMap(this.irradianceMap);
			entity.mesh.setPrefilteredMap(this.prefilteredMap);
			this.entities.push(entity);
		}
		addEntities(entities){
			this.entities = this.entities.concat(entities);
		}
		addLight(light){
			this.lights.push(light);
		}
		addLights(lights) {
			this.lights = this.lights.concat(lights);
		}
		setSun(sun){
			this.sun = sun;
		}
		setSkybox(skybox, compute){
			this.skybox = skybox;
			this.handlers['skyboxUpdated']();
			if(compute) {
				this.irradianceMap.setEnviromentMap(skybox.enviromentMap, true);
				this.prefilteredMap.setEnviromentMap(skybox.enviromentMap, true);
			}
		}
		setCamera(camera){
			this.camera = camera;
		}
		setIrradianceMap(irradianceMap){
			this.irradianceMap = irradianceMap;
			for (let e of this.entities) {
				e.mesh.setIrradianceMap(this.irradianceMap);
			}
		}
		setPrefilteredMap(prefilteredMap) {
			this.prefilteredMap = prefilteredMap;
			for (let e of this.entities) {
				e.mesh.setPrefilteredMap(this.prefilteredMap);
			}
		}
		getEntity(id){
			return this.entities.find(e => {return e.id == id});
		}
	}

// Lights
	class PointLight {
		constructor(id, position, color, brightness){
			this.id = id;
			this.color = color || new Vector3f(1,1,1);
			this.position = position || new Vector3f();
			this.brightness = brightness || 1;
		}
		setPosition(vec) {
			this.position = vec.copy();
		}
	}

// Enviroment
	class Skybox {
		constructor(cubemap){
			this.model = new Cube(Renderer.prototype.FAR_PLANE / Math.sqrt(3));
			this.cubemap = cubemap || new CubeMap();
		}
		get textureID() {
			return this.cubemap.textureID;
		}
	}
	class CubeMap {
		constructor(resolution, texture) {
			this.resolution = resolution || 16;
			this.textureID = texture || Loader.createEmptyCubeMap(this.resolution);
		}
	}
	class EnviromentMap {
		constructor(resolution){
			this.resolution = resolution;
			this.cubemap = new CubeMap(this.resolution);
		}
		get textureID() {
			return this.cubemap.textureID;
		}
	}
	class EquitangularMap {
		constructor(width, height){
			this.width = width;
			this.height = height;
			this.enviromentMap = new EnviromentMap(this.height);
			this.fbo = gl.createFramebuffer();
			this.views = [
				mat4.lookAt(mat4.create(), [0, 0, 0], [1, 0, 0], [0, -1, 0]),
				mat4.lookAt(mat4.create(), [0, 0, 0], [-1, 0, 0], [0, -1, 0]),
				mat4.lookAt(mat4.create(), [0, 0, 0], [0, 1, 0], [0, 0, 1]),
				mat4.lookAt(mat4.create(), [0, 0, 0], [0, -1, 0], [0, 0, -1]),
				mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, 1], [0, -1, 0]),
				mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, -1], [0, -1, 0])
			];
		}
		loadImage(textureID) {
			this.textureID = textureID;
			return this.prepare().then(() => this.convert());
		}
		prepare() {
			return new Promise(resolve => {
				if (!this.shader)
					Loader.loadShader(
						"shaders/pbr-precompute/cubemap.vert",
						"shaders/pbr-precompute/enviroment/enviroment.frag"
					).then(data => {
						this.shader = new PBRPrecomputeShader(data.vertexSource, data.fragmentSource);
						resolve();
					});
				else resolve();
			});
		}
		convert() {
			let projectionMatrix = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 10);
			this.shader.start();
			this.shader.loadProjectionMatrix(projectionMatrix);
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
			gl.viewport(0, 0, this.enviromentMap.resolution, this.enviromentMap.resolution);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.textureID);
			for (let i = 0; i < 6; i++) {
				this.shader.loadViewMatrix(this.views[i]);
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, this.enviromentMap.textureID, 0);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				Renderer.renderCube(1);
			}
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.enviromentMap.textureID);
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		}
	}
	class IrradianceMap {
		constructor(enviromentMap){
			this.resolution = 32;
			this.fbo = gl.createFramebuffer();
			this.enviromentMap = enviromentMap || null;
			this.cubemap = new CubeMap(this.resolution);
			this.views = [
				mat4.lookAt(mat4.create(),[0,0,0],[ 1, 0, 0],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[-1, 0, 0],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 1, 0],[0, 0, 1]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0,-1, 0],[0, 0,-1]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 0, 1],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 0,-1],[0,-1, 0])
			];
		}
		get textureID(){
			return this.cubemap.textureID;
		}
		setEnviromentMap(enviromentMap, async) {
			this.enviromentMap = enviromentMap;
			if(async) this.prepare().then(() => this.compute());
		}
		prepare(){
			return new Promise(resolve => {
				if (!this.shader)
					Loader.loadShader(
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
				gl.bindTexture(gl.TEXTURE_CUBE_MAP,this.enviromentMap.textureID);
				gl.viewport(0, 0, this.resolution, this.resolution);
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
				for(let i = 0;i < 6;i++){
					this.shader.loadViewMatrix(this.views[i]);
					gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, this.cubemap.textureID, 0);
					gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
					Renderer.renderCube(1);
				}
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			}
		}
	}
	class PrefilteredMap {
		constructor(enviromentMap) {
			this.resolution = 512;
			this.mipLevels = 5;
			this.fbo = gl.createFramebuffer();
			this.enviromentMap = enviromentMap || null;
			this.cubemap = new CubeMap(this.resolution);
			this.views = [
				mat4.lookAt(mat4.create(),[0,0,0],[ 1, 0, 0],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[-1, 0, 0],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 1, 0],[0, 0, 1]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0,-1, 0],[0, 0,-1]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 0, 1],[0,-1, 0]),
				mat4.lookAt(mat4.create(),[0,0,0],[ 0, 0,-1],[0,-1, 0])
			];
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubemap.textureID);
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		}
		get textureID() {
			return this.cubemap.textureID;
		}
		setEnviromentMap(enviromentMap) {
			this.enviromentMap = enviromentMap;
			this.prepare().then(() => this.compute());
		}
		prepare() {
			return new Promise(resolve => {
				if (!this.shader)
					Loader.loadShader(
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
				this.shader.loadInt(this.shader.getUniformLocation('resolution'), this.enviromentMap.resolution);
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.enviromentMap.textureID);
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
				for(let mip = 0; mip < this.mipLevels; mip++){
					let size = this.resolution * Math.pow(0.5,mip);
					let roughness = mip / (this.mipLevels-1);
					this.shader.loadFloat(this.shader.getUniformLocation('roughness'),roughness);
					gl.viewport(0,0,size,size);
					for(let i = 0;i < 6;i++){
						this.shader.loadViewMatrix(this.views[i]);
						gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, this.cubemap.textureID, mip);
						gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
						Renderer.renderCube(1);
					}
				}
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
			}
		}
	}

// Materials
	class Material {
	constructor(id, diffuseMap, normalMap, occlusionMap) {
		this.id = id;
		this.diffuseMap = diffuseMap || Texture.fromColor(new Color(0.8, 0.8, 0.8));
		this.normalMap = normalMap || Texture.fromColor(new Color(0.5, 0.5, 1));
		this.occlusionMap = occlusionMap || Texture.fromColor(new Color(1, 1, 1));
		this.irradianceMap = new IrradianceMap();
		this.prefilteredMap = new PrefilteredMap();
	}
	setIrradianceMap(texture) {
		if (texture) this.irradianceMap = texture;
	}
	setPrefilteredMap(texture) {
		if (texture) this.prefilteredMap = texture;
	}
	setDiffuseMap(texture) {
		if (texture) this.diffuseMap = texture;
	}
	setNormalMap(texture) {
		if (texture) this.normalMap = texture;
	}
	setOcclusionMap(texture) {
		if (texture) this.occlusionMap = texture;
	}
	copy() {
		return new Material(this.id, this.diffuseMap, this.normalMap, this.occlusionMap);
	}
	}
	class PBRMaterial extends Material {
		constructor(id, diffuseMap, normalMap, occlusionMap, metalnessMap, roughnessMap) {
			super(id, diffuseMap, normalMap, occlusionMap);
			this.metalnessMap = metalnessMap || Texture.fromColor(new Color());
			this.roughnessMap = roughnessMap || Texture.fromColor(new Color(0.25));
		}
		setMetalnessMap(texture) {
			if (texture) this.metalnessMap = texture;
		}
		setRoughnessMap(texture) {
			if (texture) this.roughnessMap = texture;
		}
		copy() {
			return new PBRMaterial(this.id, this.diffuseMap, this.normalMap, this.occlusionMap, this.metalnessMap, this.roughnessMap);
		}
	}

// Entities
	class Primitive {
		constructor(attributes, indices, vertexCount, material) {
			this.vao = gl.createVertexArray();
			this.indexBuffer = Loader.createIndexBuffer(indices.data);
			this.vertexCount = vertexCount;
			this.usedAttributes = [];
			this.material = material || new PBRMaterial('Material');
			gl.bindVertexArray(this.vao);
			for(let i in attributes){
				this.usedAttributes.push(i);
				Loader.storeDataInVao(i,attributes[i].size,attributes[i].data);
			}
			gl.bindVertexArray(null);
		}
		setMaterial(material) {
			this.material = material;
		}
	}
	class Mesh {
		constructor(id,primitives){
			this.id = id;
			this.primitives = primitives;
		}
		getMaterial(id){
			return this.primitives.find(p => {return p.material.id == id}).material;
		}
		setIrradianceMap(map){
			for (let p of this.primitives) p.material.setIrradianceMap(map);
		}
		setPrefilteredMap(map){
			for (let p of this.primitives) p.material.setPrefilteredMap(map);
		}
		get material(){
			if (this.primitives.length == 1) return this.primitives[0].material;
		}
	}
	class Entity {
		constructor(id, mesh, position, orientation, scale){
			if (!mesh) throw new TypeError(`Failed to construct 'Entity': 2 argument required, but only ${id?1:0} present.`)
			this.id = id;
			this.mesh = mesh;
			this.scale = scale || new Vector3f(1,1,1);
			this.position = position || new Vector3f();
			this.orientation = orientation || new Quaternion();
			this.rotation = this.orientation.toEulerAngles();
			this.velocity = new Vector3f();
			this.acceleration = new Vector3f();
		}
		setPosition(position){
			this.position = position.copy();
		}
		getPosition(){
			return this.position.copy();
		}
		setOrientation(orientation){
			this.orientation = orientation.copy();
		}
		getOrientation(){
			return this.orientation.copy();
		}
		getRotation(){
			return this.rotation.copy();
		}
		setScale(scale){
			this.scale = scale.copy();
		}
		getScale() {
			return this.scale.copy();
		}
		getModelMatrix(){
			let matrix = mat4.create();
			mat4.fromRotationTranslationScale(matrix, this.orientation.arr(), this.position.arr(), this.scale.arr());
			return matrix;
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
			this.orientation.mult(Quaternion.fromAxisAngle(1, 0, 0, this.rotation.x));
			this.orientation.mult(Quaternion.fromAxisAngle(0, 1, 0, this.rotation.y));
			this.orientation.mult(Quaternion.fromAxisAngle(0, 0, 1, this.rotation.z));
		}
	}

	class Camera {
		constructor(anchor){
			this.position = new Vector3f(0,0,0);
			this.orientation = new Quaternion(0, 0, 0, 1);
			this.anchor = anchor || null;
			if(this.anchor)this.anchor.camera = this;

			this.yaw = 0;
			this.pitch = 0;
		}
		input(){
			this.yaw += input.viewAxis.x * input.viewSensivity * (Math.PI / 180) * display.getFrameTime();
			this.pitch += input.viewAxis.y * input.viewSensivity * (Math.PI / 180) * display.getFrameTime();
			if (this.pitch < -Math.PI / 3) this.pitch = -Math.PI / 3;
			else if (this.pitch > Math.PI / 3) this.pitch = Math.PI / 3;
			this.orientation = Quaternion.fromAxisAngle(0, 1, 0, this.yaw).mult(Quaternion.fromAxisAngle(1, 0, 0, -this.pitch));
		}
		update(){
			if(this.anchor){
				this.position.x = this.anchor.anchorPoint.x;
				this.position.y = this.anchor.anchorPoint.y;
				this.position.z = this.anchor.anchorPoint.z;
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
			this.position = vec.copy();
		}
		getOrientation() {
			return this.orientation.copy();
		}
		setOrientation(quat) {
			this.orientation = quat.copy();
		}
		getRotation() {
			return this.orientation.toEulerAngles();
		}
		getRightVector() {
			let x = this.orientation.x,
				y = this.orientation.y,
				z = this.orientation.z,
				w = this.orientation.w;
			let X = 1 - 2 * (y * y + z * z);
			let Y = 2 * (x * y + w * z);
			let Z = 2 * (x * z - w * y);
			return new Vector3f(X, Y, Z);
		}
		getForwardVector() {
			let x = this.orientation.x,
				y = this.orientation.y,
				z = this.orientation.z,
				w = this.orientation.w;
			let X = 2 * (x * z + w * y)
			let Y = 2 * (y * z - w * x)
			let Z = 1 - 2 * (x * x + y * y);
			return new Vector3f(X, Y, Z);
		}
	}
	class Player {
		constructor(position){
			this.position = position || new Vector3f();
			this.rotation = new Vector3f();
			this.velocity = new Vector3f();
			this.acceleration = new Vector3f();
			this.anchorPoint = position ? position.copy() : new Vector3f();

			this.crouched = false;
			this.standingHeight = 1.67;
			this.crouchedHeight = 1.30;
			this.cameraHeight = this.standingHeight;

			this.walkingSpeed = 1.40;
			this.runningSpeed = 3.58;
			this.currentSpeed = this.walkingSpeed;

			this.crouchAnimatiom = new EntityAnimation(300, [
				new AnimationProperty(this, 'cameraHeight', [
					new Keyframe(0, this.standingHeight),
					new Keyframe(300, this.crouchedHeight)
				])
			],{
				reverse: false,
				easing: (t) => {
					return new Bezier(0, 0, .71, .01, .38, .99, 1, 1).get(t).y;
						
				}
			});
		}
		applyForce(vec) {
			this.acceleration.add(vec);
		}
		input() {
			switch (input.currentDevice) {
				case 'keyboard-mouse': 
					if (keyboard.getKey('ShiftLeft').pressed) {
						this.currentSpeed = this.runningSpeed;
					} else {
						this.currentSpeed = this.walkingSpeed;
					}
					if(keyboard.getKey('ControlLeft').once){
						this.crouch();
					}
					if (keyboard.getKey('Space').once) {
						this.jump();
					}
					break;
				case 'gamepad':
					if (gamepadManager.activeGamepad.getButton('circle').once) {
						this.crouch();
					}
					if (gamepadManager.activeGamepad.getButton('cross').once) {
						this.jump();
					}
					if (gamepadManager.activeGamepad.getButton('L3').once) {
						this.currentSpeed = this.currentSpeed == this.walkingSpeed ? this.runningSpeed : this.walkingSpeed;
					}
					break;
			}
			this.applyForce(this.camera.getRightVector().setY(0).flipZ().normalize().mult(input.movementAxis.x));
			this.applyForce(this.camera.getForwardVector().setY(0).flipX().normalize().mult(input.movementAxis.y));
		}
		update() {
			// Gravity
			this.applyForce(new Vector3f(0,-GRAVITY,0));
			// if(this.velocity.y < 0)
			// 	this.applyForce(new Vector3f(0,2*(this.velocity.y**2),0));
			
			// Friction
			this.applyForce(new Vector3f())
			
			this.velocity.add(this.acceleration);
			this.velocity.limit(this.currentSpeed);
			this.position.add(this.velocity.copy().mult(display.getFrameTime()));
			this.acceleration.mult(0);

			// Position Constraints
			if(this.position.y < 0){
				this.acceleration.y = 0;
				this.velocity.y = 0;
				this.position.y = 0;
			}

			// Camera Anchor
			this.anchorPoint.x = this.position.x;
			this.anchorPoint.y = this.position.y + this.cameraHeight;
			this.anchorPoint.z = this.position.z;
		}
		crouch() {
			this.crouched = !this.crouched;
			this.crouchAnimatiom.reverse = !this.crouched;
			this.crouchAnimatiom.play();
		}
		jump() {
			if (this.crouched) this.crouched = false;
			else this.applyForce(new Vector3f(0, GRAVITY*2.5, 0));
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

// Animations
	Number.lerp = (a,b,t) => {
		return (1 - t) * a + t * b;
	}

	class Timeline {
		constructor(keyframes){
			this.keyframes = keyframes || new Array();
			this.keyframes.sort((a, b) => { return a.time - b.time });
		}
		addKeyframes(keyframes) {
			this.keyframes = this.keyframes.concat(keyframes);
			this.keyframes.sort((a, b) => { return a.time - b.time });
		}
		getPropertyValue(property, time) {
			let resultKeyframe = this.keyframes.find(k => { return k.time == time });
			if (resultKeyframe) return resultKeyframe.getValue();
			else {
				let keyframeBefore = this.keyframes.filter(k => { return k.time <= time }).pop();
				let keyframeAfter = this.keyframes.filter(k => { return k.time >= time }).shift();
				if (keyframeBefore && keyframeAfter) {
					let fac = (time - keyframeBefore.time) / (keyframeAfter.time - keyframeBefore.time);
					return property.lerp(keyframeBefore.value, keyframeAfter.value, fac);
				} else if (keyframeBefore) {
					return keyframeBefore.getValue();
				} else if (keyframeAfter) {
					return keyframeAfter.getValue();
				}
			}
		}
	}
	class Keyframe {
		constructor(time, value){
			this.time = time;
			this.value = value;
			this.property = null;
		}
		setValue(val){
			this.value = val;
		}
		getValue(){
			return new this.value.constructor(this.value);
		}
	}
	class AnimationProperty {
		constructor(scope, propertyName, keyframes){
			this.scope = scope;
			this.propertyName = propertyName;
			this.keyframes = keyframes;
			this.lerp = this.scope[this.propertyName].constructor.lerp;
			for (let k of this.keyframes) {
				k.property = this.value;
			}
		}
		setValue(value){
			this.scope[this.propertyName] = value;
		}
	}
	class EntityAnimation {
		constructor(duration, properties, options = {}) {
			this.duration = duration;
			this.properties = properties;
			this.repeat = options.repeat || false;
			this.reverse = options.reverse || false;
			this.easing = options.easing || ((t) => {return t});
			this.time = 0;
			this.frameID = 0;
			this.state = 'stopped';

			this.frameTime = performance.now();
			this.lastFrameTime = performance.now();

			this.timeline = new Timeline();
			for (let p of this.properties) {
				this.timeline.addKeyframes(p.keyframes);
			}
			this.reset();
		}
		frame() {
			this.lastFrameTime = this.frameTime;
			this.frameTime = performance.now();
			this.time += (this.frameTime - this.lastFrameTime) * (this.reverse ? -1 : 1);
			if (this.time > this.duration || this.time < 0){
				this.time = this.reverse ? 0 : this.duration;
				if (this.repeat) this.reset();
				else this.pause();
			} else {
				this.frameID = requestAnimationFrame(this.frame.bind(this));
				for (let p of this.properties) {
					p.setValue(this.timeline.getPropertyValue(p,this.easing(this.time / this.duration) * this.duration));
				}
			}
		}
		reset(){
			this.time = this.reverse ? this.duration : 0;
			for (let p of this.properties) {
				p.setValue(this.timeline.getPropertyValue(p, this.time));
			}
		}
		play(){
			this.frameTime = performance.now();
			this.lastFrameTime = performance.now();
			this.frame();
		}
		pause() {
			cancelAnimationFrame(this.frameID);
		}
		stop() {
			cancelAnimationFrame(this.frameID);
			this.reset();
		}
	}