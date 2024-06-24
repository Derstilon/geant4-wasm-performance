// needs to be var to be able to use importScripts
var preModule = {
    preRun: [
        function () {
            // @ts-ignore
            FS.createLazyFile(
                "/",
                "exampleB1.in",
                "/wasm/B1/build/exampleB1.in",
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
    // setStatus: function (text) {
    //     let now = performance.now();
    //     if (!preModule.setStatus.last)
    //         preModule.setStatus.last = { time: now, text: "" };
    //     if (text === preModule.setStatus.last.text) return;
    //     let m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
    //     if (m && now - preModule.setStatus.last.time < 30) return; // if this is a progress update, skip it if too soon
    //     preModule.setStatus.last.time = now;
    //     preModule.setStatus.last.text = text;
    //     postMessage({ type: "status", data: text });
    // },
    // totalDependencies: 0,
    // monitorRunDependencies: function (left) {
    //     this.totalDependencies = Math.max(this.totalDependencies, left);
    //     preModule.setStatus(
    //         left
    //             ? "Preparing... (" +
    //                   (this.totalDependencies - left) +
    //                   "/" +
    //                   this.totalDependencies +
    //                   ")"
    //             : "All downloads complete.",
    //     );
    // },
    locateFile: (path, prefix) => {
        if ([".data", ".wasm"].some((ext) => path.endsWith(ext)))
            return `/example/B1/build/wasm/${path}`;
        return prefix + path;
    },
};

// preModule.setStatus("Downloading...");
var Module = preModule;

importScripts("../B1/build/wasm/exampleB1.js");

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
