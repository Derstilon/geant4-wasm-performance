# Efficiency of web-based visualization for Geant4 in WebAssembly

## Abstract

This tool was used to explore the efficiency of web-based visualization for Geant4 in WebAssembly. Visualization is based on canvas API using WebGL. The tool visualizes a simple Geant4 simulation of a proton beam passing through a water phantom. The simulation is run on webWorker script using a Geant4 application compiled to WebAssembly using Emscripten. The results of the tests are saved in browser data storage and can be downloaded as a JSON file. The tool was tested on different devices and browsers to evaluate the performance of the visualization.

## Setup

The tool requires wasm binaries of Geant4 compiled with Emscripten. The compilation was done on the slurm cluster using the script located in `ares` directory.

```console
sbatch --export=RETURN_DIR=/your/desired/directory ./batchGeant4.sh
```

The script will compile the Geant4 application and copy the wasm binaries to the directory specified in the `RETURN_DIR` variable.

The gean4 binaries should be placed in the `example\B1\build\wasm` path in the project root.

## Running the tool

To run the tool, you need to have a web server. You can use the Python built-in web server by running the following command in the project directory:

```bash
python -m http.server 5500
```

Then you can access the tool by opening the browser and navigating to `http://localhost:5500/example/visualization/index.html`.
