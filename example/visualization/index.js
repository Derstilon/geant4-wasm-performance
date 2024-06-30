// Import function from tje render.js file
import { initializeWebWorker } from "./simulation.js";
import { startVisualization } from "./render.js";
import {
    saveResultsToLocalStorage,
    storeFullParams,
    storeLogs,
} from "./logger.js";
import {
    createDownloadableButtons,
    enableUI,
    generateTestScenarios,
    setCurrentTestTitle,
} from "./ui.js";

export function zipObjectFromParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = Array.from(urlParams.entries()).reduce(
        (acc, [key, value]) => {
            acc[key] ??= [];
            acc[key].push(value);
            return acc;
        },
        {},
    );
    return params;
}

export function zipObjectToParams(obj, onlyFirst = false) {
    const urlParams = new URLSearchParams();
    for (const key in obj) {
        if (onlyFirst) {
            urlParams.append(key, obj[key][0]);
            continue;
        }
        obj[key].forEach((value) => {
            urlParams.append(key, value);
        });
    }
    return urlParams;
}

function refreshForNextTest(urlParams) {
    const newUrl = `${window.location.pathname}?${urlParams}`;
    // setTimeout(() => {
    window.location.href = newUrl;
    // }, 150);
}
function initializeTestRun(urlParams) {
    storeFullParams(urlParams);
    storeLogs("timeStamps", ["testStart", performance.now()]);
    const initPromise = initializeWebWorker(urlParams);
    const visualizationPromise = startVisualization(urlParams);
    return Promise.all([initPromise, visualizationPromise]);
}

function findNextTestParams(params, textParams, paramValueArrays) {
    return new Promise((resolve) => {
        if (paramValueArrays.length === 0) return resolve(null);
        // @ts-ignore
        return ldb.list((keys) => {
            // find the first key that is not in the keys array
            for (
                let arrayIdx = 0;
                arrayIdx < paramValueArrays.length;
                arrayIdx++
            ) {
                const array = paramValueArrays[arrayIdx];
                for (let i = 0; i < array.length; i++) {
                    textParams = zipObjectToParams(params, true);
                    if (!keys.includes(`${textParams}`)) {
                        paramValueArrays[0].push(paramValueArrays[0].shift());
                        return resolve(textParams);
                    }
                    array.push(array.shift());
                }
                array.push(array.shift());
            }
            return resolve(null);
        });
    });
}
function localeNumberArray(length, numberFn = (i) => i) {
    return Array.from({ length }, (_, i) => numberFn(i));
}

function prepareTestFromParams() {
    generateTestScenarios([
        {
            name: "Minimal testing scenario",
            params: { i: [0] },
        },
        {
            name: "High frame rate scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(5, (i) => 2 ** (2 * i + 1)).reverse(), // 2^9
                b: localeNumberArray(5, (i) => 2 ** (2 * i)).reverse(), // 2^8
                p: ["electron", "proton"],
                r: ["all_raw", "all_processed"],
                t: [120, 24],
            },
        },
        {
            name: "Long new values visualization scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(6, (i) => 2 ** (3 * i)).reverse(), // 2^15
                b: localeNumberArray(5, (i) => 2 ** (2 * i)).reverse(), // 2^8
                p: ["electron", "proton"],
                r: ["new_raw", "new_processed"],
                t: [0, 0.5],
            },
        },
        {
            name: "All protons scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(8, (i) => 2 ** (2 * i)).reverse(), // 2^14
                b: localeNumberArray(5, (i) => 2 ** (2 * i)).reverse(), // 2^8
                p: ["proton"],
                r: ["all_raw", "all_processed"],
                t: [0, 0.5],
            },
        },
        {
            name: "All electrons scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(11, (i) => 2 ** i).reverse(), // 2^10
                b: localeNumberArray(5, (i) => 2 ** (2 * i)).reverse(), // 2^8
                p: ["electron"],
                r: ["all_raw", "all_processed"],
                t: [0, 0.5],
            },
        },
        {
            name: "Full rendering testing scenario",
            params: {
                i: localeNumberArray(1),
                n: localeNumberArray(10, (i) => 2 ** i).reverse(), // 2^9
                b: localeNumberArray(5, (i) => 2 ** (2 * i)).reverse(), // 2^8
                p: ["electron", "proton"],
                r: ["new_raw", "all_raw", "new_processed", "all_processed"],
                t: [0, 0.5, 24, 120],
            },
        },
        {
            name: "Without rendering scenario",
            params: {
                i: localeNumberArray(10),
                n: localeNumberArray(16, (i) => 2 ** i).reverse(),
                b: localeNumberArray(5, (i) => 2 ** (2 * i)).reverse(),
                p: ["electron", "proton"],
                r: ["none"],
                t: [0],
            },
        },
    ]);
    // Get the current URL search params
    const params = zipObjectFromParams();
    let testParams = new URLSearchParams();
    let paramValueArrays = Object.values(params);

    findNextTestParams(params, testParams, paramValueArrays).then(
        (testParams) => {
            if (testParams === null) {
                createDownloadableButtons();
                enableUI();
                return;
            }
            setCurrentTestTitle(`${testParams}`.replaceAll("&", " "));
            initializeTestRun(testParams).then(() => {
                storeLogs("timeStamps", ["testEnd", performance.now()]);
                saveResultsToLocalStorage(`${testParams}`);
                refreshForNextTest(zipObjectToParams(params));
            });
        },
    );
}
window.onload = prepareTestFromParams;
