import * as THREE from 'three/src/Three'
import * as pako from 'pako';
import {MaterialCreator} from "./WebChunkMaterialLoader";
import {Mesh} from "three";

/**
 * A custom loader class for compressed and optimized meshes
 */
export class WebChunkMeshLoader extends THREE.Loader {
    /**
     * The materials
     */
    private materials: MaterialCreator;

    /**
     * Sets the materials
     * @param materials
     */
    public setMaterials(materials: MaterialCreator): WebChunkMeshLoader {
        this.materials = materials;
        return this;
    }

    /**
     * Loads the mesh from the given url
     * @param url The url
     * @param onLoad The event that is called when the mesh is loaded
     * @param onProgress The event that is called when there is progress update
     * @param onError The event that is called when there was an error while loading the chunk
     */
    public load(url: string, onLoad: (mesh: Mesh) => void = null, onProgress = null, onError = null) {
        const loader = new THREE.FileLoader(this.manager);
        loader.setPath(this.path);
        loader.setResponseType('arraybuffer');
        loader.setRequestHeader(this.requestHeader);
        loader.setWithCredentials(this.withCredentials);
        loader.load( url, ( data ) => {
            try {
                if (data instanceof ArrayBuffer) {
                    onLoad(this.parse(data));
                }
            } catch ( e ) {
                if ( onError ) {
                    onError( e );
                } else {
                    console.error( e );
                }
                this.manager.itemError( url );
            }
        }, onProgress, onError );
    }

    /**
     * Parse the given data
     * @param buffer The buffer
     */
    private parse(buffer: ArrayBuffer): THREE.Mesh {

        // Using zlib to decompress the stream
        buffer = pako.inflateRaw(buffer).buffer;

        // TODO: Handle different endianness in vertex and index buffers

        // Creates a data view
        const view = new DataView(buffer);
        let pos = 0;

        // Creates the geometry
        const geometry = new THREE.BufferGeometry();

        // Reads the vertex buffer
        const stride = 11;
        const vertexCount = view.getInt32(pos, true); pos += 4;
        const vertices = new Float32Array(buffer, pos, vertexCount * stride);
        const vertexBuffer = new THREE.InterleavedBuffer(vertices, stride);
        geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(vertexBuffer, 3, 0));
        geometry.setAttribute('uv', new THREE.InterleavedBufferAttribute(vertexBuffer, 2, 3));
        geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(vertexBuffer, 3, 5, true));
        geometry.setAttribute('color', new THREE.InterleavedBufferAttribute(vertexBuffer, 3, 8));
        pos += vertexCount * stride * 4;

        // Reads the index buffer
        const indexCount = view.getInt32(pos, true); pos += 4;
        const indices = new Uint32Array(buffer, pos, indexCount);
        const indexBuffer = new THREE.BufferAttribute(indices, 1);
        geometry.setIndex(indexBuffer);
        pos += indexCount * 4;


        geometry.clearGroups();

        const materials = [];
        const decoder = new TextDecoder();
        const materialCount = view.getInt32(pos, true); pos += 4;
        let index = 0;
        for (let i = 0; i<materialCount; i++) {
            const indexCount = view.getUint32(pos, true); pos += 4;
            const len = view.getUint8(pos); pos += 1; // TODO: The string length could be more than one byte
            const nameBuffer = buffer.slice(pos, pos + len);
            const name = decoder.decode(nameBuffer);
            pos += len;

            let materialIndex = materials.findIndex(m => m.name === name);
            if (materialIndex === -1) {
                materialIndex = materials.length;
                const material = this.materials.create(name);
                materials.push(material);
            }

            geometry.addGroup(index, indexCount, materialIndex);
            index += indexCount;
        }

        // Creates the mesh
        return new THREE.Mesh(geometry, materials);
    }
}
