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

    async fetchBuffer(url){
        return await fetch(url).then(async res => {
            return await res.arrayBuffer().then(data => {
                return data;
            });
        });
    }

    parseMaterial(materialData){
        let material = new Material();
        material.setDiffuseMap(Loader.createTextureFromColor(new Vector3f(materialData.pbrMetallicRoughness.baseColorFactor)));
        material.setRoughnessMap(Loader.createTextureFromColor(new Vector3f(materialData.pbrMetallicRoughness.roughnessFactor)));
        material.setMetalnessMap(Loader.createTextureFromColor(new Vector3f(materialData.pbrMetallicRoughness.metallicFactor)));
        return material;
    }

    parseAccessor(gltf,scene,index){
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

    async load(url){
        return await fetchFile(url).then(async data => {
            let gltf = JSON.parse(data);
            let scene = {};
            scene.nodes = [];
            scene.meshes = [];
            scene.materials = [];
            scene.buffers = [];
            for (let buf of gltf.buffers) {
                if (buf.uri.startsWith('data:application/octet-stream;base64,')){
                    scene.buffers.push(base64ToArrayBuffer(buf.uri));
                } else {
                    scene.buffers.push(await this.fetchBuffer(`${getPath(url)}/${buf.uri}`));
                }
            }
            for (let mat of gltf.materials) {
                scene.materials.push(this.parseMaterial(mat));
            }
            for (let mesh of gltf.meshes) {
                let name = mesh.name || 'Mesh';
                let primitives = [];
                for (let p of mesh.primitives) {
                    let indices = this.parseAccessor(gltf, scene, p.indices);
                    let material = scene.materials[p.material] ? scene.materials[p.material].copy() : undefined;
                    let attributes = [];
                    for (let a in p.attributes) {
                        attributes[this.AOM[a]] = this.parseAccessor(gltf, scene, p.attributes[a]);
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
}

function getPath(url){
    return url.match(/(.+)\/.+$/)[1];
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

function base64ToArrayBuffer(base64) {
    let binary_string = window.atob(base64.match(/(?<=base64,).+$/g));
    let bytes = new Uint8Array(binary_string.length);
    for (let i in bytes) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}