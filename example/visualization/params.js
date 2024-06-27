const _defaultTestParams = {
    n: 128,
    b: 1,
    p: "proton",
    r: "all_raw",
    t: 0.5,
};

export function getFullParams(testParams = new URLSearchParams()) {
    const {
        n: numberOfSimulatedEvents,
        b: numberOfBins,
        p: particleType,
        r: dataHandling,
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
export function getHumanReadableParams(testParams = new URLSearchParams()) {
    const {
        numberOfSimulatedEvents,
        numberOfBins,
        particleType,
        dataHandling,
        targetFrames,
    } = getFullParams(testParams);
    return `n=[${numberOfSimulatedEvents}] <br/> b=[${numberOfBins}] <br/> p=[${particleType}] <br/> r=[${dataHandling}] <br/> t=[${targetFrames}]`;
}
