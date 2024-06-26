// Import function from tje render.js file
import { initializeWebWorker } from "./simulation.js";
import { startVisualization } from "./render.js";
import {
    saveResultsToLocalStorage,
    storeFullParams,
    storeLogs,
} from "./logger.js";
import { getHumanReadableParams } from "./params.js";
const millisecondsInSecond = 1000;
const millisecondsInMinute = millisecondsInSecond * 60;
function createDownloadableButtons() {
    const paramsDiv = document.querySelector("#params");
    if (!paramsDiv) return;
    paramsDiv.innerHTML = "";
    // @ts-ignore
    ldb.getAll((data) => {
        data.forEach(({ k: key, v: value }) => {
            const button = document.createElement("button");
            button.innerHTML = getHumanReadableParams(new URLSearchParams(key));
            // on click save stringified json from local storage to file
            button.onclick = () => {
                const blob = new Blob([value], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${key}.json`;
                a.click();
            };
            // append button to div
            paramsDiv.appendChild(button);
        });
        // add button to download every file from local storage as a zip
        const button = document.createElement("button");
        button.innerHTML = "Download all";
        button.id = "downloadAll";
        button.onclick = () => {
            // @ts-ignore
            const zip = new JSZip();
            data.forEach(({ k: key, v: value }) => {
                zip.file(`${key}.json`, value);
            });
            zip.generateAsync({ type: "blob" }).then((content) => {
                const url = URL.createObjectURL(content);
                const a = document.createElement("a");
                a.href = url;
                a.download = "results.zip";
                a.click();
            });
        };
        button.disabled = data.length === 0;
        paramsDiv.appendChild(button);
    });
}
function timeDifferenceLocaleString(begin, end) {
    const timeDifference = end - begin;
    const minutes = Math.floor(timeDifference / millisecondsInMinute);
    const seconds = Math.floor(
        (timeDifference % millisecondsInMinute) / millisecondsInSecond,
    );
    return `${minutes}m ${seconds}s`;
}
function logLocalStorageInBody() {
    // add data from local storage to body as a list
    const paramsDiv = document.querySelector("#params");
    if (paramsDiv)
        // @ts-ignore
        ldb.getAll((data) => {
            data.map(({ k: key, v: value }) => {
                return [key, JSON.parse(value)["timeStamps"]];
            })
                .sort((a, b) => ([b[0], a[0]].sort()[0] === b[0] ? 1 : -1))
                .forEach(([key, value]) => {
                    const p = document.createElement("p");
                    const timeString = timeDifferenceLocaleString(
                        value[0][1],
                        value[value.length - 1][1],
                    );
                    p.innerHTML = `${key.replaceAll(
                        "&",
                        " ",
                    )}<br\>${timeString}`;
                    paramsDiv.appendChild(p);
                });
        });
}
function zipObjectFromParams() {
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
function zipObjectToParams(obj, onlyFirst = false) {
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
function localeNumberArray(length, numberFn = (i) => i) {
    return Array.from({ length }, (_, i) => numberFn(i));
}
function generateTestScenarios(button) {
    const testDiv = document.querySelector("#testScenarios");
    if (!testDiv) {
        typeof console.error("No testScenarios div found");
        return;
    }

    const testScenarios = [
        {
            name: "Full testing scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(22, (i) => 2 ** i),
                b: localeNumberArray(10, (i) => 2 ** i),
                p: ["proton", "electron"],
                r: [
                    "new_raw",
                    "all_raw",
                    "new_processed",
                    "all_processed",
                    "none",
                ],
                t: ["0", "0.5", "24", "60", "120"],
            },
        },
        {
            name: "All protons scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(9, (i) => 4 ** i),
                b: localeNumberArray(10, (i) => 2 ** i),
                p: ["proton"],
                r: ["all_raw", "all_processed"],
                t: ["24", "60", "120"],
            },
        },
        {
            name: "New protons scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(10, (i) => 4 ** i),
                b: localeNumberArray(10, (i) => 2 ** i),
                p: ["proton"],
                r: ["new_raw", "new_processed"],
                t: ["24", "60", "120"],
            },
        },
        {
            name: "All electrons scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(9, (i) => 2 ** i),
                b: localeNumberArray(10, (i) => 2 ** i),
                p: ["electron"],
                r: ["all_raw", "all_processed"],
                t: ["24", "60", "120"],
            },
        },
        {
            name: "New electrons scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(11, (i) => 2 ** i),
                b: localeNumberArray(10, (i) => 2 ** i),
                p: ["electron"],
                r: ["new_raw", "new_processed"],
                t: ["24", "60", "120"],
            },
        },
        {
            name: "Test scenario 1",
            params: {
                i: ["0"],
                n: ["1024", "4096"],
                b: ["1", "2"],
                p: ["proton"],
                r: ["new_raw"],
                t: ["24"],
            },
        },
        {
            name: "Test scenario 2",
            params: {
                i: ["0", "1"],
                n: ["4096"],
                b: ["256"],
                p: ["proton"],
                r: [
                    "all_processed",
                    "all_raw",
                    "new_raw",
                    "new_processed",
                    "none",
                ],
                t: ["3"],
            },
        },
        {
            name: "Test scenario 3",
            params: {
                i: ["0", "1"],
                n: ["8192"],
                b: ["512"],
                p: ["proton"],
                r: ["all_processed", "all_raw", "none"],
                t: ["0", "0.5", "24"],
            },
        },
    ];
    testDiv.innerHTML = "";
    for (const { name, params } of testScenarios) {
        const button = document.createElement("button");
        button.innerHTML = name;
        button.onclick = () => {
            const urlParams = zipObjectToParams(params);
            window.location.search = urlParams.toString();
        };
        testDiv.appendChild(button);
    }
    button.disabled = true;
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

function prepareTestFromParams() {
    const scenarioBtn = document.querySelector("#generateScenariosBtn");
    if (scenarioBtn && scenarioBtn instanceof HTMLButtonElement)
        scenarioBtn.onclick = () => generateTestScenarios(scenarioBtn);
    // Get the current URL search params
    const params = zipObjectFromParams();
    let testParams = new URLSearchParams();
    let paramValueArrays = Object.values(params);

    findNextTestParams(params, testParams, paramValueArrays).then(
        (testParams) => {
            if (testParams === null) return createDownloadableButtons();
            const title = document.querySelector("#currentTest");
            if (title) title.innerHTML = `${testParams}`.replaceAll("&", " ");
            initializeTestRun(testParams).then(() => {
                storeLogs("timeStamps", ["testEnd", performance.now()]);
                saveResultsToLocalStorage(`${testParams}`);
                refreshForNextTest(zipObjectToParams(params));
            });
        },
    );
}
window.onload = prepareTestFromParams;
