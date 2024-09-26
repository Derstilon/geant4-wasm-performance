type Result = {
    numberOfSimulatedEvents: string; // "integer"
    numberOfBins: string; // "integer"
    particleType: "electron" | "proton";
    dataHandling:
        | "new_raw"
        | "all_raw"
        | "new_optimized"
        | "all_optimized"
        | "none";
    targetFrames: string; // "float"
    browser: string; // "browserName browserVersion"
    timeStamps: Array<TimeStampEntity>;
    renderTime: number;
    frameCount: number;
    stepLogs: Array<StepLogEntity>;
    handleTime: number;
    messageCount: number;
    dataSize: number;
    messageLogs: Array<MessageLogEntity>;
};
type TimeStampEntity = [string, number]; // ["timeStampLabel", float]
type StepLogEntity = {
    handleStart: number;
    optimizeStart: number | null;
    renderStart: number | null;
    stepEnd: number;
    remainingMessages: number;
};
type MessageLogEntity = {
    sendTime: number;
    receiveTime: number;
    handleTime: number;
    packageSize: number;
};
