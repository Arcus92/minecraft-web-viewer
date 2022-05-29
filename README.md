![](images/minecraft-web-viewer.png)

The `MinecraftMapViewer` lets you explore your Minecraft worlds in 3D within your web browser. 

The world files must be converted with the [Minecraft Web Exporter](https://github.com/Arcus92/MinecraftWebExporter) first. This will not draw your Minecraft server in *real-time*.

Don't believe me? [Try the demo on my homepage!](https://3dmap.david-schulte.de/#w=world&tx=196&tz=382.4&cx=155&cy=93.7&cz=402.6)

### !!! This project is still under construction !!!

This project is still in the early stages of development. Many features are missing or incomplete. For example:
- The tool supports multiple worlds. There is no world selection, but you can change the world by modifying the url: `#w=other_world`. 
- The viewer will always with the world named `world`. You can change the initial world in your HTML initialisation script: `MinecraftWebViewer.init({ world: 'new_world' });`
- There is no error handling when a world could not be found.
- The user can not change the viewing distance. This can cause performance issues on low-end devises.

## Requirements

The web viewer can run on any static web server. There is no backend required. 

To compile the project files you have to install [Node.js](https://nodejs.org/).

## Installation

- Install [Node.js](https://nodejs.org/) with the Node Package Manager *(NPM)*.
- Checkout the code via `git` or download the zip archive and extract it.
- Open a terminal, navigate to the project directory. 
- Run `npm ci` to install the required node modules.
- Run `npm run dev` to start a local web server on `http://localhost:9000/`. You can copy your exported world files into `dist` for testing. 


## Deploy to your server

- Run `npm run build` to build the web viewer into the `dist` directory.
- Upload the content of the `dist` folder onto your web server.
- Upload the converter world files created by the [Minecraft Web Exporter](https://github.com/Arcus92/MinecraftWebExporter) into the same directory.

# Notice

this project wouldn't have been possible without:
- [Three.js](https://github.com/mrdoob/three.js/)
- [Pako](https://github.com/nodeca/pako)

# License

```text
MIT License

Copyright (c) 2022 David Schulte

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```