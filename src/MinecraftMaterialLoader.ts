import * as pako from 'pako';
import * as THREE from "three/src/Three";
import {LoadingManager, MeshPhongMaterial} from "three";
import {DefaultLoadingManager, Mapping, Material, Texture, TextureLoader} from "three/src/Three";
import {MeshPhongMaterialParameters} from "three/src/materials/MeshPhongMaterial";
import {UVMapping} from "three/src/constants";

/**
 * The binary material loader
 */
export class MinecraftMaterialLoader extends THREE.Loader {

    /**
     * Loads the mesh from the given url
     * @param url The url
     * @param onLoad The event that is called when the mesh is loaded
     * @param onProgress The event that is called when there is progress update
     * @param onError The event that is called when there was an error while loading the chunk
     */
    public load(url: string, onLoad: (materials: MaterialCreator) => void = null, onProgress = null, onError = null) {
        const path = this.path === '' ? THREE.LoaderUtils.extractUrlBase(url) : this.path;
        const loader = new THREE.FileLoader(this.manager);
        loader.setPath(this.path);
        loader.setResponseType('arraybuffer');
        loader.setRequestHeader(this.requestHeader);
        loader.setWithCredentials(this.withCredentials);
        loader.load( url, ( data ) => {
            try {
                if (data instanceof ArrayBuffer) {
                    onLoad(this.parse(data, path));
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
     * @param path The resource path
     */
    private parse(buffer: ArrayBuffer, path: string): MaterialCreator {

        // Using zlib to decompress the stream
        buffer = pako.inflateRaw(buffer).buffer;

        // Creates a data view
        const view = new DataView(buffer);
        let pos = 0;

        const materialsInfo: { [name: string]: MaterialInfo } = {};

        const decoder = new TextDecoder();
        const materialCount = view.getInt32(pos, true); pos += 4;
        for (let i = 0; i<materialCount; i++) {
            const materialInfo = new MaterialInfo();

            let len = view.getUint8(pos); pos += 1;
            const nameBuffer = buffer.slice(pos, pos + len);
            const name = decoder.decode(nameBuffer);
            pos += len;

            // Read the texture
            len = view.getUint8(pos); pos += 1; // TODO: The string length could be more than one byte
            const textureBuffer = buffer.slice(pos, pos + len);
            materialInfo.url = decoder.decode(textureBuffer);
            pos += len;

            // Read the transparent byte
            materialInfo.transparent = view.getUint8(pos) != 0; pos += 1;

            // Load the animation
            const animation = new MaterialAnimation();
            animation.frameCount = view.getInt32(pos, true); pos += 4;
            animation.frameTime = view.getInt32(pos, true); pos += 4;
            const frames = view.getInt32(pos, true); pos += 4;
            animation.frames = [];
            if (frames > 0) {
                for (let f=0; f<frames; f++) {
                    animation.frames[f] = view.getInt32(pos, true); pos += 4;
                }
            } else {
                for (let f=0; f<animation.frameCount; f++) {
                    animation.frames[f] = f;
                }
            }
            if (animation.frameCount > 0) {
                materialInfo.animation = animation;
            }

            materialsInfo[name] = materialInfo;
        }


        const materialCreator = new MaterialCreator(this.resourcePath || path);
        materialCreator.setCrossOrigin(this.crossOrigin);
        materialCreator.setManager(this.manager);
        materialCreator.setMaterials(materialsInfo);
        return materialCreator;
    }
}

/**
 * The material info element
 */
class MaterialInfo {
    /**
     * The texture url
     */
    public url: string;

    /**
     * The transparency of the texture
     */
    public transparent: boolean;

    /**
     * The animation
     */
    public animation: MaterialAnimation;
}

/**
 * Animation info
 */
class MaterialAnimation {
    /**
     * The animation frames
     */
    public frameTime: number;

    /**
     * The animation frames
     */
    public frameCount: number;

    /**
     * The animation frames
     */
    public frames: number[];
}

/**
 * The material creator for binary files
 */
export class MaterialCreator {
    /**
     * The base url
     */
    private baseUrl: string;

    /**
     * Creates the material creator
     * @param baseUrl The base url
     */
    public constructor(baseUrl: string = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * The load manager
     */
    private manager: LoadingManager;

    /**
     * Sets the load manager
     */
    public setManager(value: LoadingManager): MaterialCreator {
        this.manager = value;
        return this;
    }

    /**
     * The cross-origin
     */
    private crossOrigin: string;

    /**
     * Sets the cross-origin
     * @param value The cross-origin value
     */
    public setCrossOrigin(value: string): MaterialCreator {
        this.crossOrigin = value;
        return this;
    }

    /**
     * The materials
     */
    private materials: { [name: string]: Material } = {};

    /**
     * The material infos
     */
    private materialsInfo: { [name: string]: MaterialInfo };

    /**
     * Sets the materials
     * @param value The material infos
     */
    public setMaterials(value: { [name: string]: MaterialInfo }): MaterialCreator {
        this.materialsInfo = value;
        return this;
    }

    /**
     * The created material array
     */
    private materialsArray: Material[];

    /**
     * Returns all materials as array
     */
    public getAsArray(): Material[] {
        if (!this.materialsArray) {
            this.materialsArray = [];
            let index = 0;

            for (const materialName in this.materialsInfo) {

                this.materialsArray[index] = this.create(materialName);
                index ++;

            }
        }

        return this.materialsArray;
    }

    /**
     * Returns the material with the given name
     * @param name The material name
     * @private The three material
     */
    public create(name: string): Material {
        if (!this.materials[name]) {
            this.materials[name] = this.createMaterial(name);
        }
        return this.materials[name];
    }

    /**
     * Creates the material with the given name
     * @param name The material name
     * @private The three material
     */
    private createMaterial(name: string): Material {
        const materialInfo = this.materialsInfo[name];

        const params: MeshPhongMaterialParameters = {};

        // Handle transparent pixels
        params.alphaTest = 0.5;
        params.vertexColors = true;

        params.reflectivity = 0;
        params.shininess = 0;

        // Handle semi-transparent textures
        if (materialInfo.transparent) {
            params.transparent = true;
            params.blending = THREE.NormalBlending;
            params.depthWrite = false;
        }

        const map = this.loadTexture(MaterialCreator.resolveURL(this.baseUrl, materialInfo.url));

        // Disable texture filtering
        map.magFilter = THREE.NearestFilter;
        map.minFilter = THREE.LinearMipMapLinearFilter;
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.anisotropy = 0;
        map.generateMipmaps = false;

        // Create the material
        const material = new MeshPhongMaterial(params);
        material.name = name;
        material.map = map;
        material.needsUpdate = true;

        // Setup animations
        if (materialInfo.animation) {
            // Starts animation ticks
            if (!this.materialAnimation) {
                this.materialAnimation = [];

                setInterval(() => this.materialAnimationTick(), 200);
            }

            material.map.repeat.setY(1 / materialInfo.animation.frameCount);
            this.materialAnimation.push({material, animation: materialInfo.animation, currentFrame: 0});
        }

        this.materials[name] = material;
        return material;
    }

    /**
     * Resolves the relative url
     * @param baseUrl
     * @param url
     * @private
     */
    private static resolveURL(baseUrl: string, url: string) {
        if (typeof url !== 'string' || url === '')
            return '';

        // Absolute URL
        if (/^https?:\/\//i.test(url)) return url;

        return baseUrl + url;
    }

    /**
     * Loads the given texture
     * @param url The url to the texture
     * @param mapping The texture mapping
     * @param onLoad
     * @param onProgress
     * @param onError
     * @private
     */
    private loadTexture(url: string, mapping: Mapping = UVMapping, onLoad = undefined, onProgress = undefined, onError = undefined) {

        const manager = (this.manager) ? this.manager : DefaultLoadingManager;
        let loader: TextureLoader = <TextureLoader>manager.getHandler(url);

        if (loader === null) {
            loader = new TextureLoader(manager);
        }

        if (loader.setCrossOrigin) loader.setCrossOrigin(this.crossOrigin);

        const texture: Texture = loader.load(url, onLoad, onProgress, onError);

        if (mapping) texture.mapping = mapping;

        return texture;
    }


    /**
     * The material animation
     * @private
     */
    private materialAnimation: { material: Material, animation: MaterialAnimation, currentFrame: number }[];

    /**
     * A tick for the material animation
     */
    private materialAnimationTick() {
        // Tick animations
        for (const item of this.materialAnimation) {
            if (item.material instanceof MeshPhongMaterial) {
                item.currentFrame++;
                if (item.currentFrame >= item.animation.frames.length)
                    item.currentFrame = 0;

                const index = item.animation.frames[item.currentFrame];

                item.material.map.offset.setY(-index / item.animation.frameCount);
            }
        }
    }


}