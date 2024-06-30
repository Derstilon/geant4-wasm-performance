const _defaultTestParams = {
    i: -1,
    n: 128,
    b: 1,
    p: "proton",
    r: "all_raw",
    t: 0.5,
};

export function getFullParams(testParams = new URLSearchParams()) {
    const {
        i,
        n,
        b,
        p: particleType,
        r: dataHandling,
        t,
    } = {
        // fill in missing parameters with defaults
        ..._defaultTestParams,
        ...Object.fromEntries(Array.from(testParams.entries())),
    };
    return {
        iteration: parseInt(`${i}`),
        numberOfSimulatedEvents: parseInt(`${n}`),
        numberOfBins: parseInt(`${b}`),
        particleType,
        dataHandling,
        targetFrames: parseFloat(`${t}`),
    };
}
export function sortParams(A, B) {
    const {
        i: a0,
        n: a1,
        b: a2,
        p: a3,
        r: a4,
        t: a5,
    } = Object.fromEntries(Array.from(A.entries()));
    const {
        i: b0,
        n: b1,
        b: b2,
        p: b3,
        r: b4,
        t: b5,
    } = Object.fromEntries(Array.from(B.entries()));
    return a5 == b5
        ? a4 == b4
            ? a3 == b3
                ? a2 == b2
                    ? a1 == b1
                        ? a0 - b0
                        : a1 - b1
                    : a2 - b2
                : a3.localeCompare(b3)
            : a4.localeCompare(b4)
        : a5 - b5;
}
export function getHumanReadableParams(testParams = new URLSearchParams()) {
    const {
        iteration,
        numberOfSimulatedEvents,
        numberOfBins,
        particleType,
        dataHandling,
        targetFrames,
    } = getFullParams(testParams);
    return `<span class="buttonTable"><span>i=[${iteration}]</span><span>t=[${targetFrames}]</span><span>p=[${particleType}]</span><span>n=[${numberOfSimulatedEvents}]</span><span>b=[${numberOfBins}]</span><span>r=[${dataHandling}]</span>`;
}
