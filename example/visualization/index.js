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

function findNextTestParams(
    params,
    testParams,
    paramValueArrays,
    arrayIdx = 0,
) {
    if (arrayIdx >= paramValueArrays.length) return Promise.resolve(null);
    return new Promise((resolve) => {
        const array = paramValueArrays[arrayIdx];
        testParams = zipObjectToParams(params, true);
        array.push(array.shift());
        // @ts-ignore
        return ldb.get(`${testParams}`, (localDataValue) => {
            if (localDataValue === null) return resolve(testParams);
            testParams = zipObjectToParams(params, true);
            // @ts-ignore
            ldb.get(`${testParams}`, (localDataValue2) => {
                if (localDataValue2 === null) return resolve(testParams);
                array.unshift(array.pop());
                findNextTestParams(
                    params,
                    testParams,
                    paramValueArrays,
                    arrayIdx + 1,
                ).then(resolve);
            });
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
            name: "Full testing scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(22, (i) => 2 ** i).reverse(),
                b: localeNumberArray(10, (i) => 2 ** i).reverse(),
                p: ["proton", "electron"],
                r: [
                    "new_raw",
                    "all_raw",
                    "new_processed",
                    "all_processed",
                    "none",
                ],
                t: ["0", "0.5", "24", "120"],
            },
        },
        {
            name: "All protons scenario",
            params: {
                i: localeNumberArray(3),
                n: localeNumberArray(8, (i) => 2 * 4 ** i).reverse(),
                b: localeNumberArray(10, (i) => 2 ** i).reverse(),
                p: ["proton"],
                r: ["all_raw", "all_processed"],
                t: ["0", "24", "120"],
            },
        },
        {
            name: "All protons scenario part 1",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(5, (i) => 8 ** i).reverse(),
                b: localeNumberArray(5, (i) => 4 ** i).reverse(),
                p: ["proton"],
                r: ["all_raw", "all_processed"],
                t: ["0", "24", "120"],
            },
        },
        {
            name: "All protons scenario part 2",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(5, (i) => 4 * 8 ** i).reverse(),
                b: localeNumberArray(5, (i) => 4 ** i).reverse(),
                p: ["proton"],
                r: ["all_raw", "all_processed"],
                t: ["0", "24", "120"],
            },
        },
        {
            name: "New protons scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(8, (i) => 4 ** i).reverse(),
                b: localeNumberArray(10, (i) => 2 ** i).reverse(),
                p: ["proton"],
                r: ["new_raw", "new_processed"],
                t: ["0", "24", "120"],
            },
        },
        {
            name: "All electrons scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(8, (i) => 2 ** i).reverse(),
                b: localeNumberArray(10, (i) => 2 ** i).reverse(),
                p: ["electron"],
                r: ["all_raw", "all_processed"],
                t: ["0", "24", "120"],
            },
        },
        {
            name: "New electrons scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(8, (i) => 4 ** i).reverse(),
                b: localeNumberArray(10, (i) => 2 ** i).reverse(),
                p: ["electron"],
                r: ["new_raw", "new_processed"],
                t: ["0", "24", "120"],
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
