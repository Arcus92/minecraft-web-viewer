import {MapViewer} from "./MapViewer";
import {MapViewerOptions} from "./MapViewerOptions";

/**
 * Initialize the Minecraft web viewer
 * @param options The options for the map viewer
 */
export function init(options?: MapViewerOptions): MapViewer {
    const viewer = new MapViewer();
    viewer.init(options);
    return viewer;
}