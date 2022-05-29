import {MapView} from "./MapView";

export interface WorldInfo {
    /**
     * The home position
     */
    home?: number[];

    /**
     * The materials
     */
    materials: string[];

    /**
     * The views
     */
    views: MapView[];
}