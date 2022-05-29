import {MapView} from "./MapView";
import {Mesh} from "three";
import {MinecraftChunkMeshLoader} from "./MinecraftChunkMeshLoader";

/**
 * A loaded part of the world. The coordinates of this chunk are divided by the MapView.chunkSpan.
 */
export class MapChunk {
    /**
     * Gets the global x coordinate of this chunk
     */
    public x: number;

    /**
     * Gets the global z coordinate of this chunk
     */
    public z: number;

    /**
     * The view of the loaded chunk
     */
    public view: MapView;

    /**
     * The current chunk loader
     */
    public loader: MinecraftChunkMeshLoader;

    /**
     * The loaded mesh
     */
    public mesh: Mesh;

    /**
     * A flag to mark this as unloaded
     */
    public unloaded: boolean = false;

    /**
     * Unloads the geometry
     */
    public unload() {
        // Unload from scene
        if (this.mesh) {
            this.mesh.geometry.dispose();
        }
        this.mesh = null;
        this.unloaded = true;
    }
}