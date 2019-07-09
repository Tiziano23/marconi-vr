class GLTFLoader {
    constructor(){
        this.AOM = {
            'POSITION':0,
            'TEXCOORD_0':1,
            'NORMAL':2,
            'TANGENT':3
        };
        this.TSM = {
            'SCALAR':1,
            'VEC2':2,
            'VEC3':3,
            'VEC4':4,
            'MAT4':16
        }
    }
    async load(url) {
        return await fetchFile(url).then(async data => {
            let gltf = JSON.parse(data);
            let scene = {};
            scene.nodes = [];
            scene.meshes = [];
            scene.images = [];
            scene.buffers = [];
            scene.materials = [];
            for (let buf of gltf.buffers) {
                if (buf.uri.startsWith('data:application/octet-stream;base64,')) {
                    scene.buffers.push(base64ToArrayBuffer(buf.uri));
                } else {
                    scene.buffers.push(await this.fetchBuffer(`${getPath(url)}/${buf.uri}`));
                }
            }
            for (let img of gltf.images) {
                scene.images.push(this.parseImage(img, gltf, scene));
            }
            for (let mat of gltf.materials) {
                scene.materials.push(this.parseMaterial(mat, gltf, scene));
            }
            for (let mesh of gltf.meshes) {
                let name = mesh.name || 'Mesh';
                let primitives = [];
                for (let p of mesh.primitives) {
                    let indices = this.parseAccessor(p.indices, gltf, scene);
                    let material = scene.materials[p.material] ? scene.materials[p.material].copy() : undefined;
                    let attributes = [];
                    for (let a in p.attributes) {
                        attributes[this.AOM[a]] = this.parseAccessor(p.attributes[a], gltf, scene);
                    }
                    primitives.push(new Primitive(attributes, indices, indices.count, material));
                }
                scene.meshes.push(new Mesh(name, primitives));
            }
            for (let i of gltf.scenes[0].nodes) {
                let node = gltf.nodes[i];
                let mesh = scene.meshes[node.mesh];
                let position = new Vector3f(node.translation);
                let rotation = new Vector3f(node.rotation);
                let scale = node.scale ? node.scale[0] : 1;
                scene.nodes.push(new Entity(mesh, position, rotation, scale));
            }
            return scene;
        });
    }
    async fetchBuffer(url){
        return await fetch(url).then(async res => {
            return await res.arrayBuffer().then(data => {
                return data;
            });
        });
    }
    parseImage(imageData, gltf, scene){
        let bufferView = gltf.bufferViews[imageData.bufferView];
        let buffer = scene.buffers[bufferView.buffer];
        let data = buffer.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength);
        let dataURI = URL.createObjectURL(new Blob([new Uint8Array(data)], {type: imageData.mimeType}));
        return {
            name: imageData.name,
            mimeType: imageData.mimeType,
            texture: new Texture(dataURI)
        };
    }
    parseMaterial(data, gltf, scene){
        let material = new Material();
        if (data.normalTexture) {
            material.setNormalMap(scene.images[gltf.textures[data.normalTexture.index].source].texture);
        }
        if (data.pbrMetallicRoughness.baseColorTexture){
            let textureIndex = gltf.textures[data.pbrMetallicRoughness.baseColorTexture.index].source;
            material.setDiffuseMap(scene.images[textureIndex].texture);
        } else if (data.pbrMetallicRoughness.baseColorFactor) {
            material.setDiffuseMap(Loader.createTextureFromColor(new Vector3f(materialData.pbrMetallicRoughness.baseColorFactor)));
        }
        if (data.pbrMetallicRoughness.metallicRoughnessTexture) {
            let textureIndex = gltf.textures[data.pbrMetallicRoughness.metallicRoughnessTexture.index].source;
            material.setRoughnessMap(scene.images[textureIndex].texture);
        } else if (data.pbrMetallicRoughness.roughnessFactor) {
            material.setRoughnessMap(Loader.createTextureFromColor(new Vector3f(data.pbrMetallicRoughness.roughnessFactor)));
        }
        if (data.pbrMetallicRoughness.metallicTexture) {
            let textureIndex = gltf.textures[data.pbrMetallicRoughness.metallicTexture.index].source;
            material.setMetalnessMap(scene.images[textureIndex].texture);
        } else if (data.pbrMetallicRoughness.metallicFactor) {
            material.setMetalnessMap(Loader.createTextureFromColor(new Vector3f(data.pbrMetallicRoughness.metallicFactor)));
        }
        return material;
    }
    parseAccessor(index, gltf, scene) {
        let accessor = gltf.accessors[index];
        let bufferView = gltf.bufferViews[accessor.bufferView];
        let buffer = scene.buffers[bufferView.buffer];
        let size = this.TSM[accessor.type];
        return {
            size: size,
            count: accessor.count,
            dataType: accessor.componentType,
            data: buffer.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength)
        }
    }
}

function getPath(url){
    return url.match(/(.+)\/.+$/)[1];
}
function base64ToArrayBuffer(base64) {
    let binary_string = window.atob(base64.match(/(?<=base64,).+$/g));
    let bytes = new Uint8Array(binary_string.length);
    for (let i in bytes) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
async function fetchFile(url) {
    return await fetch(url).then(res => {
        let file = "";
        let r = res.body.getReader();
        let td = new TextDecoder('utf-8');
        return r.read().then(function readChunk(chunk){
            if (chunk.done) return file;
            file += td.decode(chunk.value);
            return r.read().then(readChunk);
        });
    });
}