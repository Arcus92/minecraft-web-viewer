export interface MapViewerOptions {
    /**
     * The initial world path
     */
    world?: string;

    /**
     * The 3d canvas host element or element id
     */
    container?: HTMLElement | string;


    /**
     * Should mobile users be warned about the performance and data issues?
     */
    warnMobileUsers?: boolean;
}