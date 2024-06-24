const _defaultTestParams = {
    n: 128,
    b: 1,
    p: "proton",
    d: "all_raw",
    t: "24",
};
const particleOptions = {
    proton: ["proton", "60 MeV"],
    electron: ["e+", "6 MeV"],
};
const testResults = {};
let timeOriginDiff = 0;
function getFullParams(testParams = {}) {
    const {
        n: numberOfSimulatedEvents,
        b: numberOfBins,
        p: particleType,
        d: dataHandling,
        t: targetFrames,
    } = {
        // fill in missing parameters with defaults
        ..._defaultTestParams,
        ...Object.fromEntries(Array.from(testParams.entries())),
    };
    return {
        numberOfSimulatedEvents,
        numberOfBins,
        particleType,
        dataHandling,
        targetFrames,
    };
}
export function getInputFile(testParams = {}) {
    const { numberOfSimulatedEvents, numberOfBins, particleType } =
        getFullParams(testParams);
    const nBin = Array.from({ length: 3 }, () => `${numberOfBins}`).join(" ");
    const particle = particleOptions[particleType][0];
    const energy = particleOptions[particleType][1];
    const beamOn = numberOfSimulatedEvents;
    return [
        `/process/em/verbose 0`,
        `/run/verbose 0`,
        `/control/verbose 0`,
        ``,
        `/score/create/boxMesh boxMesh`,
        `/score/mesh/boxSize 50. 50. 50. mm`,
        `/score/mesh/nBin ${nBin}`,
        `/score/quantity/energyDeposit eDep`,
        ``,
        `/score/close`,
        ``,
        `/run/initialize`,
        ``,
        `/process/em/verbose 0`,
        `/run/verbose 0`,
        `/control/verbose 0`,
        ``,
        `/gps/particle ${particle}`,
        `/gps/energy ${energy}`,
        `/gps/ang/rot1 0 1 0`,
        `/gps/ang/rot2 1 1 0`,
        `/gps/position 0. 0. -3. cm`,
        `/gps/pos/type Beam`,
        `/gps/pos/type Beam`,
        `/gps/pos/radius 0.1 cm`,
        `/gps/pos/sigma_x 0.1 cm`,
        `/gps/pos/sigma_y 0.1 cm`,
        `/gps/ang/type beam2d`,
        `/run/beamOn ${beamOn}`,
    ].join("\n");
}
export function initializeWebWorker(testParams = {}) {
    const inputFile = getInputFile(testParams);
    return new Promise((resolve, reject) => {
        const messageHandler = ({
            data: {
                type: messageType,
                data: messagePayload,
                time: messageTimestamp,
            },
        }) => {
            const handleTimestamp = performance.now();
            switch (messageType) {
                case "timeOrigin":
                    timeOriginDiff = messagePayload - performance.timeOrigin;
                    break;
                case "exit":
                    testResults.simulationLog = messagePayload;
                    resolve(testResults);
                    break;
                case "print":
                    console.warn(messagePayload);
                    break;
                case "event":
                    if (messagePayload !== "onRuntimeInitialized") break;
                    geant4Worker.postMessage({
                        type: "run",
                        data: inputFile,
                    });
                    break;
                default:
                    console.log(messageType, messagePayload);
            }
        };
        const geant4Worker = new Worker("worker.js");
        //reject on error
        geant4Worker.onerror = reject;
        geant4Worker.onmessage = messageHandler;
    });
}
