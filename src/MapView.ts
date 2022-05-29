export class MapView {
    /**
     * Gets the filename prefix. This is used to build the output file: {filename}.{x}.{z}.m
     */
    public filename: string;

    /**
     * Gets and sets how many Minecraft chunks written to a single geometry file.
     * This value has to be a divisor of 32 and can not be larger than 32, so it fits into a region.
     */
    public chunkSpan: number = 1;

    /**
     * Gets the distance
     */
    public distance: number;
}