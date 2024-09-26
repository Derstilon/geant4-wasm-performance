const particleOptions = {
    proton: ["proton", "60 MeV"],
    electron: ["e-", "6 MeV"],
};
const encoder = new TextEncoder();
let simulationStatus = 0; // 0 - pending, 1 - initializing, 2 - running, 3 - finished
let timeOriginDiff = 0;
import { enqueueData } from "./data.js";
import { increaseStoredNumber, storeLogs } from "./logger.js";
import { getFullParams } from "./params.js";
export function getInputFile(testParams = new URLSearchParams()) {
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
export function initializeWebWorker(testParams = new URLSearchParams()) {
    const inputFile = getInputFile(testParams);
    const { dataHandling } = getFullParams(testParams);
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
                    simulationStatus = 3; // 0 - pending, 1 - initializing, 2 - running, 3 - finished
                    const { endTime, startTime } = messagePayload;
                    storeLogs("timeStamps", [
                        "simulationStart",
                        startTime + timeOriginDiff,
                    ]);
                    storeLogs("timeStamps", [
                        "simulationEnd",
                        endTime + timeOriginDiff,
                    ]);
                    resolve(true);
                    break;
                case "print":
                    break;
                case "event":
                    if (messagePayload !== "onRuntimeInitialized") break;
                    storeLogs("timeStamps", ["workerStart", performance.now()]);
                    simulationStatus = 1; // 0 - pending, 1 - initializing, 2 - running, 3 - finished
                    geant4Worker.postMessage({
                        type: "run",
                        data: inputFile,
                    });
                    break;
                case "render":
                    if (dataHandling === "none") break;
                    simulationStatus = 2; // 0 - pending, 1 - initializing, 2 - running, 3 - finished
                    const packageSize = encoder.encode(
                        JSON.stringify(messagePayload),
                    ).length;
                    increaseStoredNumber("messageCount");
                    increaseStoredNumber("dataSize", packageSize);
                    enqueueData({
                        payload: messagePayload,
                        sendTime: messageTimestamp + timeOriginDiff,
                        receiveTime: handleTimestamp,
                        packageSize,
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
// 0 - pending, 1 - initializing, 2 - running, 3 - finished
export function isSimulationFinished() {
    return simulationStatus === 3;
}
export function isSimulationRunning() {
    return simulationStatus === 2;
}
export function isSimulationInitializing() {
    return simulationStatus === 1;
}
export function isSimulationPending() {
    return simulationStatus === 0;
}
