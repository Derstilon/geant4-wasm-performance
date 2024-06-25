const _defaultTestParams = {
    n: 128,
    b: 1,
    p: "proton",
    r: "all_raw",
    t: "24",
};
export function getFullParams(testParams = {}) {
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
