import THREE = require("three");
import {
    AmbientLight,
    DirectionalLight,
    LoadingManager, Mesh,
    PerspectiveCamera
} from "three";
import {MapControls} from "three/examples/jsm/controls/OrbitControls";
import {WebChunkMeshLoader} from "./WebChunkMeshLoader";
import {MaterialCreator, WebChunkMaterialLoader} from "./WebChunkMaterialLoader";
import {MapView} from "./MapView";
import {MapChunk} from "./MapChunk";
import {WorldInfo} from "./WorldInfo";
import {MapViewerOptions} from "./MapViewerOptions";

export class MapViewer {

    /**
     * Inits the viewer in the document root
     */
    public init(options?: MapViewerOptions) {

        let shadowMapSize = 2048;
        let containerElement = document.body;
        let warnMobileUsers = true;

        if (options) {
            // Reads the initial world path
            if (options.world !== undefined) {
                this.initialWorldPath = options.world;
            }

            // Reads the container element for the 3D canvas
            if (options.container !== undefined) {
                if (options.container instanceof HTMLElement) {
                    containerElement = options.container;
                } else {
                    containerElement = document.getElementById(options.container);
                }
            }

            // Should the mobile warning be shown
            if (options.warnMobileUsers !== undefined) {
                warnMobileUsers = options.warnMobileUsers;
            }
        }

        // Check for mobile users and warn
        if(/Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)) {
            // Reduce viewing distance and shadow resolution
            this.chunkLoadDistance = 10;
            this.chunkUnloadDistance = 12;
            shadowMapSize = 512;

            // Hacky mobile warning
            if (warnMobileUsers) {
                if (!window.confirm("Dear smartphone user,\n" +
                    "this site draws a Minecraft world in real time 3D. This will use up both your data volume and your battery. A WiFi connection is highly recommended!\n" +
                    "Would you like to continue anyway?")) {
                    return;
                }
            }
        }


        // Creates the renderer
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x78a7ff, 1.0);
        containerElement.appendChild(this.renderer.domElement);

        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Creates the scene
        this.scene = new THREE.Scene();

        // Creates the camera
        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 5000);

        // Creates the ambient light
        this.ambientLight = new THREE.AmbientLight(0xdddddd, 0.8);
        this.scene.add(this.ambientLight);

        // Creates the light
        this.light = new THREE.DirectionalLight(0xffffff, 0.8);
        const lightFrustum = 255;
        this.light.castShadow = true
        this.light.shadow.mapSize.width = shadowMapSize;
        this.light.shadow.mapSize.height = shadowMapSize;
        this.light.shadow.camera.near = 0.5;
        this.light.shadow.camera.far = 200;
        this.light.shadow.camera.left = -lightFrustum;
        this.light.shadow.camera.right = lightFrustum;
        this.light.shadow.camera.top = -lightFrustum;
        this.light.shadow.camera.bottom = lightFrustum;
        this.light.shadow.bias = -0.001;
        this.light.shadow.normalBias = 0.001;
        this.scene.add(this.light);
        this.scene.add(this.light.target);

        // Creates the controls
        this.controls = new MapControls(this.camera, this.renderer.domElement);
        this.controls.target.set( 0, this.cameraCenterHeight, 0 );
        this.camera.position.set( 0, this.cameraCenterHeight + 100, 50 );
        this.controls.update();
        this.controls.addEventListener('change', () => this.onControlChanged());

        // Creates the loading manager
        this.loadingManager = new THREE.LoadingManager();

        // Update
        this.updateLightPosition();

        // Renders the first frame and start the render loop
        this.animate();

        // Add handler
        window.addEventListener('resize', (e) => this.onWindowResize(e));
        window.addEventListener('hashchange', (e) => this.onHashChange(e), false);

        // Load the initial state
        this.loadStateByHash();

        // Loads the world
        this.loadWorld(this.initialWorldPath);

        // Updates the viewer state every second
        window.setInterval(() => this.storeStateToHash(), 500);

        // Start the chunk loading
        this.startChunkLoading();
    }

    // Renderer

    /**
     * The webgl renderer
     */
    public renderer: THREE.WebGLRenderer;

    /**
     * The webgl scene
     */
    public scene: THREE.Scene;

    /**
     * The window was resized
     * @param e The event data
     */
    private onWindowResize(e: UIEvent) {
        // Update the camera and renderer
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * The window hash was changed
     * @param e The event data
     */
    private onHashChange(e: HashChangeEvent) {
        this.loadStateByHash();
    }


    /**
     * A flag to check if the camera was changed since the last time stateStateToHash was called
     * @private
     */
    private controlChangedLastInterval: boolean = true;

    /**
     * The camera control was changed
     */
    private onControlChanged() {
        this.controlChangedLastInterval = true;
    }

    /**
     * Loads and applies the state of the viewer from the given string.
     */
    private loadStateByHash() {
        let hash = window.location.hash;
        if (!hash) return;

        // Remove the #
        hash = hash.substring(1);

        // Load the state
        this.loadStateByString(hash);
    }

    /**
     * Loads and applies the state of the viewer from the given string.
     * @param state The state string must in url-search-parameter style. If empty or invalid nothing is changed.
     */
    private loadStateByString(state: string) {
        if (!state) return;

        const params = new URLSearchParams(state);

        const worldPath = params.get('w');
        const tx = parseFloat(params.get('tx'));
        const tz = parseFloat(params.get('tz'));
        const cx = parseFloat(params.get('cx'));
        const cy = parseFloat(params.get('cy'));
        const cz = parseFloat(params.get('cz'));

        // Change the world
        if (worldPath) {
            if (worldPath !== this.worldPath) {
                this.loadWorld(worldPath);
            }
        }

        // Change the camera
        if (!(isNaN(tx) || isNaN(tz) || isNaN(cx) || isNaN(cy) || isNaN(cz))) {
            this.camera.position.set(cx, cy, cz);
            this.controls.target.setX(tx);
            this.controls.target.setZ(tz);
            this.cameraIsSetByUser = true;
        } else {
            this.cameraIsSetByUser = false;
        }
    }

    /**
     * Stores the state of the viewer to the location hash.
     */
    private storeStateToHash() {
        if (this.controlChangedLastInterval) {
            this.controlChangedLastInterval = false;
            return;
        }

        const state = this.saveStateToString();
        if (!state) return;

        // This won't trigger the hashchange event and also won't create a history entry
        history.replaceState(null, null, document.location.pathname + '#' + state);
    }

    /**
     * Stores the state of the viewer to a string and returns it.
     */
    private saveStateToString(): string {
        const params = new URLSearchParams();

        const tx = Math.round(this.controls.target.x * 10) / 10;
        const tz = Math.round(this.controls.target.z * 10) / 10;
        const cx = Math.round(this.camera.position.x * 10) / 10;
        const cy = Math.round(this.camera.position.y * 10) / 10;
        const cz = Math.round(this.camera.position.z * 10) / 10;

        if (this.worldPath) params.set('w', this.worldPath);
        params.set('tx', tx.toString());
        params.set('tz', tz.toString());
        params.set('cx', cx.toString());
        params.set('cy', cy.toString());
        params.set('cz', cz.toString());

        return params.toString();
    }

    /**
     * The animation method
     */
    private animate() {
        // Request the next frame
        requestAnimationFrame(() => this.animate());

        // Updates the controls
        this.controls.update();

        // Update the light position
        this.updateLightPosition();

        // Renders the frame
        this.renderer.render(this.scene, this.camera);
    }


    // Camera

    /**
     * The main camera
     */
    public camera: PerspectiveCamera;

    /**
     * The camera distance on the last frame
     * @private
     */
    private cameraDistance: number = 0;

    /**
     * The height of the camera origin
     */
    public cameraCenterHeight = 64;

    /**
     * The camera position was set by the url hash
     */
    private cameraIsSetByUser: boolean;

    /**
     * The camera controls
     */
    public controls: MapControls;


    // Light

    /**
     * The main directional light
     */
    public light: DirectionalLight;

    /**
     * The ambient light
     */
    public ambientLight: AmbientLight;

    /**
     * The height of the light target
     */
    public lightCenterHeight = 64;

    /**
     * The offset from the light target to the light origin
     */
    public lightOriginOffset = new THREE.Vector3(-64, 256, -32);

    /**
     * Updates the light position to the camera position
     */
    private updateLightPosition() {
        const x = Math.round(this.controls.target.x);
        const z = Math.round(this.controls.target.z);

        const distance = this.controls.getDistance();
        if (this.cameraDistance != distance) {

            this.cameraDistance = distance;
            const lightFrustum = distance * 3 + 100;
            this.light.shadow.camera.near = 0.5;
            this.light.shadow.camera.far = lightFrustum + 1000;
            this.light.shadow.camera.left = -lightFrustum;
            this.light.shadow.camera.right = lightFrustum;
            this.light.shadow.camera.top = -lightFrustum;
            this.light.shadow.camera.bottom = lightFrustum;
            this.light.shadow.camera.updateProjectionMatrix();
        }

        this.light.position.set(x + this.lightOriginOffset.x, this.lightCenterHeight + this.lightOriginOffset.y, z + this.lightOriginOffset.z);
        this.light.target.position.set(x, this.lightCenterHeight, z);
    }

    // World

    /**
     * The chunk distance away from the camera after a chunk is unloaded
     */
    public chunkUnloadDistance = 16;

    /**
     * The chunk distance in which range chunks are loaded
     */
    public chunkLoadDistance = 14;

    /**
     * The list of all loaded chunks
     */
    private chunks: MapChunk[] = [];

    /**
     * The loading manager
     */
    private loadingManager: LoadingManager;

    /**
     * The loaded materials
     */
    private materials: { [key: string]: MaterialCreator } = {};

    /**
     * The path to the world that should be loaded on initialization
     */
    private initialWorldPath: string = 'world';

    /**
     * The path to the world data
     */
    private worldPath: string;

    /**
     * The world info
     */
    private worldInfo: WorldInfo;

    /**
     * Loads the world info file
     */
    private loadWorld(worldPath: string) {
        if (!worldPath) return;

        this.initialWorldPath = null;

        // Unloads the current world first
        this.unloadWorld();

        // Loads the world info
        fetch(worldPath + '/info.json')
        .then(response => response.json())
        .then(json => {
            this.worldPath = worldPath;
            this.worldInfo = json;

            // Sort the view order by distance
            this.worldInfo.views.sort((a, b) => b.distance - a.distance);

            // Use the home location for the camera if there is no custom camera position stored in the hash
            if (this.worldInfo.home && !this.cameraIsSetByUser) {
                const home = this.worldInfo.home;
                this.controls.target.set( home[0], this.cameraCenterHeight, home[2] );
                this.camera.position.set( home[0], this.cameraCenterHeight + 100, home[2] + 50 );
            }

            // Start loading the materials
            this.loadMaterials();
        });
    }

    /**
     * Unloads the world
     */
    private unloadWorld() {
        this.worldPath = undefined;
    }

    /**
     * The path to the material data
     */
    private materialPath: string = '';

    /**
     * Sets the material path
     */
    public setMaterialPath(path: string) {
        this.materialPath = path;
    }

    /**
     * Loads the materials
     */
    private loadMaterials() {
        // Load the block materials and starts chunk loading
        this.loadMaterialFile('block', () => {

        })
    }

    /**
     * Loads the given material file and writes it into this.materials.
     * @param key The material prefix (e.g. block)
     * @param next The callback when the material are loaded
     */
    private loadMaterialFile(key: string, next: () => void = null) {
        // Loads the material file
        const matLoader = new WebChunkMaterialLoader(this.loadingManager);
        matLoader.setPath(this.materialPath);
        matLoader.load(key + '.mats', (m) => {
            this.materials[key] = m;
            if (next) next();
        });
    }

    /**
     * Starts the loading of the chunks
     */
    private startChunkLoading() {
        // Starts the update ticks to load more chunks
        setInterval(() => this.updateViews(), 200);
    }

    /**
     * Updates all views
     */
    private updateViews() {
        if (!this.worldPath) return;

        const distance = this.controls.getDistance();

        // Calculates the current chunk position
        const chunkX = Math.floor(this.controls.target.x / 16);
        const chunkZ = Math.floor(this.controls.target.z / 16);

        for (let view of this.worldInfo.views) {
            if (distance > view.distance) {
                this.updateView(view, chunkX, chunkZ);
                break;
            }
        }
    }

    /**
     * Updates the current view
     */
    private updateView(view: MapView, chunkX: number, chunkZ: number) {

        chunkX = Math.floor(chunkX / view.chunkSpan);
        chunkZ = Math.floor(chunkZ / view.chunkSpan);

        this.checkUnloadChunks(view, chunkX, chunkZ);
        this.checkLoadChunks(view, chunkX, chunkZ);
    }

    /**
     * A chunk was loaded
     * @param view The view for this chunk
     * @param chunkX The x coordinate
     * @param chunkZ The z coordinate
     */
    private onChunkLoaded(view: MapView, chunkX: number, chunkZ: number) {

        // Checks if a higher view could be unloaded
        for (const v of this.worldInfo.views) {
            if (v.distance >= view.distance)
                continue;

            const chunkHX = Math.floor(chunkX * view.chunkSpan / v.chunkSpan);
            const chunkHZ = Math.floor(chunkZ * view.chunkSpan / v.chunkSpan);

            const chunkHIndex = this.chunks.findIndex((c) => c.x === chunkHX && c.z === chunkHZ && c.view === v);
            if (chunkHIndex >= 0) {
                const chunkH = this.chunks[chunkHIndex];

                // Remove from scene
                if (chunkH.mesh) {
                    this.scene.remove(chunkH.mesh);
                }
                chunkH.unload();

                // Remove from array
                this.chunks.splice(chunkHIndex, 1);
            }
        }
    }

    /**
     * Unloads all chunks outside a given region
     * @param view The view of the given chunk
     * @param chunkX The center chunk x position
     * @param chunkZ The center chunk z position
     * @private
     */
    private checkUnloadChunks(view: MapView, chunkX: number, chunkZ: number) {
        const halfDistance = this.chunkUnloadDistance / 2;

        // Unloads the chunks
        for (let c = 0; c < this.chunks.length; c++) {
            const chunk = this.chunks[c];
            if (chunk.x < chunkX - halfDistance || chunk.x > chunkX + halfDistance ||
                chunk.z < chunkZ - halfDistance || chunk.z > chunkZ + halfDistance ||
                chunk.view !== view) {
                // Remove from scene
                if (chunk.mesh) {
                    this.scene.remove(chunk.mesh);
                }
                chunk.unload();

                // Remove from array
                this.chunks.splice(c, 1);
                c--;
            }
        }
    }

    /**
     * Updates the loaded chunks
     */
    private checkLoadChunks(view: MapView, chunkX: number, chunkZ: number) {
        // Loads the chunks
        MapViewer.loadSpiral(this.chunkLoadDistance, 8, (x, y) => {
            return this.loadChunkIfNeeded(view, chunkX + x, chunkZ + y);
        });
    }

    /**
     * A method that calls load in a spiral.
     * @param distance The distance (positive and negative) of the spiral.
     * @param max The maximum number of elements to load.
     * @param load The load method. Must return true if the element is counted.
     * @private
     */
    private static loadSpiral(distance: number, max: number, load: (x: number, y: number) => boolean) {
        const halfDistance = distance / 2;
        const sqrDistance = distance * distance;

        let count = 0;
        let sx = 0;
        let sy = 0;
        let dx = 0;
        let dy = -1;
        for (let i = 0; i < sqrDistance; i++) {
            if (-halfDistance < sx && sx <= halfDistance &&
                -halfDistance < sy && sy <= halfDistance) {

                if (load(sx, sy)) {
                    count++;
                }

                if (count >= max)
                    break;
            }

            if (sx == sy || (sx < 0 && sx == -sy) || (sx > 0 && sx == 1 - sy)) {
                let tmp = dx;
                dx = -dy;
                dy = tmp;
            }
            sx += dx;
            sy += dy;
        }
    }

    /**
     * Loads the chunk at the given position if it is unloaded
     * @param view The view
     * @param x The chunk x position
     * @param z The chunk x position
     */
    private loadChunkIfNeeded(view: MapView, x: number, z: number): boolean {
        // Skip loaded chunks
        if (this.chunks.some(c => c.x === x && c.z === z && c.view === view))
            return false;

        // Loads the chunk
        this.loadChunk(view, x, z);
        return true;
    }

    /**
     * Loads the given chunk
     * @param view The view
     * @param x The chunk x coordinate
     * @param z The chunk y coordinate
     */
    private loadChunk(view: MapView, x: number, z: number) {
        // Calculates the region and chunk position
        const chunks = 32 / view.chunkSpan;
        const regionX = Math.floor(x / chunks);
        const regionZ = Math.floor(z / chunks);
        const chunkX = ((x % chunks) + chunks) % chunks;
        const chunkZ = ((z % chunks) + chunks) % chunks;

        // Builds the path to the mesh file
        const url = `r.${regionX}.${regionZ}/${view.filename}.${chunkX}.${chunkZ}.m`;

        const chunk = new MapChunk();
        chunk.x = x;
        chunk.z = z;
        chunk.view = view;
        chunk.loader = this.loadMeshFile(url, (mesh: Mesh) => {

            chunk.mesh = mesh;

            // Checks if the chunk was already unloaded
            if (chunk.unloaded) {
                // Remove from scene
                if (chunk.mesh) {
                    this.scene.remove(chunk.mesh);
                }
                chunk.unload();
            } else {
                mesh.position.set(x * 16 * view.chunkSpan, 0, z * 16 * view.chunkSpan);
                this.scene.add(mesh);
                this.onChunkLoaded(view, x, z);
            }
        });

        this.chunks.push(chunk);
    }

    /**
     * Loads the given mesh file
     * @param url The url to the mesh file
     * @param onLoad The load event
     */
    private loadMeshFile(url: string, onLoad: (mesh: Mesh) => void): WebChunkMeshLoader {
        const loader = new WebChunkMeshLoader(this.loadingManager);
        loader.setPath(this.worldPath + '/');
        loader.setMaterials(this.materials['block']);
        loader.load(url, (mesh) => {
            // Enable shadow on the mesh
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            onLoad(mesh);
        });
        return loader;
    }
}