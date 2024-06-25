const particleOptions = {
    proton: ["proton", "60 MeV"],
    electron: ["e+", "6 MeV"],
};
const encoder = new TextEncoder();
let simulationStatus = "pending";
let timeOriginDiff = 0;
import { enqueueData } from "./data.js";
import { increaseStoredNumber, storeLogs } from "./logger.js";
import { getFullParams } from "./params.js";
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
                    simulationStatus = "finished";
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
                    simulationStatus = "running";
                    geant4Worker.postMessage({
                        type: "run",
                        data: inputFile,
                    });
                    break;
                case "render":
                    if (dataHandling === "none") break;
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
export function getSimulationStatus() {
    return simulationStatus;
}
