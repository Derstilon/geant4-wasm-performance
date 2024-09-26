// needs to be var to be able to use importScripts
var preModule = {
    preRun: [
        function () {
            // @ts-ignore
            FS.createLazyFile(
                "/",
                "exampleB1.in",
                "geant4-wasm-performance/B1/build/exampleB1.in",
                true,
                true,
            );
        },
    ],
    postRun: [],
    onRuntimeInitialized() {
        postMessage({
            type: "event",
            data: "onRuntimeInitialized",
        });
    },
    print: (function () {
        return function (text) {
            if (arguments.length > 1)
                text = Array.prototype.slice.call(arguments).join(" ");
        };
    })(),
    locateFile: (path, prefix) => {
        if ([".data", ".wasm"].some((ext) => path.endsWith(ext)))
            return `geant4-wasm-performance/B1/build/wasm/${path}`;
        return prefix + path;
    },
};

// preModule.setStatus("Downloading...");
var Module = preModule;

importScripts("geant4-wasm-performance/B1/build/wasm/exampleB1.js");

const writeFile = (data, debug = false) => {
    // @ts-ignore
    FS.writeFile("example.in", data);
    if (!debug) return;
    console.log(
        "writeFile",
        // @ts-ignore
        FS.readFile("example.in", { encoding: "utf8" }),
    );
};

self.onmessage = ({ data: { type: messageType, data: massagePayload } }) => {
    switch (messageType) {
        case "run":
            writeFile(massagePayload);
            Module.init();
            this.postMessage({
                type: "timeOrigin",
                data: performance.timeOrigin,
                time: performance.now(),
            });
            let startTime = performance.now();
            Module.run("example.in");
            let endTime = performance.now();
            Module.clear();
            postMessage({
                type: "exit",
                data: {
                    endTime,
                    startTime,
                },
                time: performance.now(),
            });
            break;
        default:
            console.log(messageType, massagePayload);
    }
};
