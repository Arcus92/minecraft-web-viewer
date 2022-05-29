import {MinecraftViewer} from "./MinecraftViewer";

// Creates the viewer when the site is loaded
window.addEventListener("load", function() {
    // TODO: Move this to index.html so the initialization is not part of the script file.
    const viewer = new MinecraftViewer();
    viewer.setWorldPath('world');
    viewer.init();
});


