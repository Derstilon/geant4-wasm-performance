import { zipObjectToParams } from "./index.js";
import { saveResultsToLocalStorage } from "./logger.js";
import {
    fullParamsToURLKey,
    getFullParams,
    getHumanReadableParams,
    sortParams,
} from "./params.js";

const millisecondsInSecond = 1000;
const millisecondsInMinute = millisecondsInSecond * 60;
function timeDifferenceLocaleString(begin, end) {
    const timeDifference = end - begin;
    const minutes = Math.floor(timeDifference / millisecondsInMinute);
    const seconds = Math.floor(
        (timeDifference % millisecondsInMinute) / millisecondsInSecond,
    );
    return `${minutes}m ${seconds}s`;
}
export function logLocalStorageInBody() {
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

function createUploadButton() {
    const paramsDiv = document.querySelector("#params");
    if (!paramsDiv) return;
    paramsDiv.innerHTML = "";
    const button = document.createElement("button");
    button.innerHTML = "Upload zip file with incomplete tests";
    button.id = "downloadAll";
    button.onclick = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".zip";
        input.onchange = (e) => {
            // @ts-ignore
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                button.disabled = true;
                // @ts-ignore
                const zip = new JSZip();
                // @ts-ignore
                zip.loadAsync(e.target.result).then((zip) => {
                    console.log(zip);
                    const promises = Object.values(zip.files).map(
                        (file) =>
                            new Promise((resolve) => {
                                file.async("string").then((content) => {
                                    const parsed = JSON.parse(content);
                                    // parsed.browser = navigator.sayswho;
                                    // content = JSON.stringify(parsed);
                                    if (!parsed) return resolve(true);
                                    saveResultsToLocalStorage(
                                        parsed,
                                        content,
                                        resolve,
                                    );
                                });
                            }),
                    );
                    Promise.all(promises).then(() => {
                        window.location.href = window.location.pathname;
                    });
                });
            };
            reader.readAsArrayBuffer(file);
        };
        input.click();
    };
    paramsDiv.appendChild(button);
}

export function createDownloadableButtons() {
    const paramsDiv = document.querySelector("#params");
    if (!paramsDiv) return;
    paramsDiv.innerHTML = "";
    // @ts-ignore
    ldb.getAll((data) => {
        if (data.length === 0) return createUploadButton();
        const sortedData = data.sort(({ k: keyA }, { k: keyB }) =>
            sortParams(
                new URLSearchParams(`?${keyA}`),
                new URLSearchParams(`?${keyB}`),
            ),
        );
        // add button to download every file from local storage as a zip
        const button = document.createElement("button");
        button.innerHTML = "Download all";
        button.id = "downloadAll";
        button.onclick = () => {
            // @ts-ignore
            const zip = new JSZip();
            data.forEach(({ k: key, v: value }) => {
                // @ts-ignore
                zip.file(`${key}&${navigator.sayswho}.json`, value);
            });
            zip.generateAsync({ type: "blob" }).then((content) => {
                const url = URL.createObjectURL(content);
                const a = document.createElement("a");
                a.href = url;
                a.download = "logs.zip";
                a.click();
            });
        };
        paramsDiv.appendChild(button);
        sortedData.forEach(({ k: key, v: value }) => {
            const button = document.createElement("button");
            button.innerHTML = getHumanReadableParams(new URLSearchParams(key));
            // on click save stringified json from local storage to file
            button.onclick = () => {
                const blob = new Blob([value], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                // @ts-ignore
                a.download = `${key}&${navigator.sayswho}.json`;
                a.click();
            };
            // append button to div
            paramsDiv.appendChild(button);
        });
    });
}

export function setCurrentTestTitle(title) {
    const header = document.querySelector("#currentTest");
    if (header) header.innerHTML = title;
    document.title = `Test in progress: ${title}`;
    const stopButton = document.querySelector("#stopCurrentTestBatch");
    if (stopButton instanceof HTMLButtonElement) {
        stopButton.onclick = () => {
            window.location.href = window.location.pathname;
        };
        stopButton.disabled = false;
        stopButton.hidden = false;
    }
}
export function generateTestScenarios(testScenarios = []) {
    const scenarioBtn = document.querySelector("#generateScenariosBtn");
    const testDiv = document.querySelector("#testScenarios");
    if (scenarioBtn instanceof HTMLButtonElement)
        if (testDiv instanceof HTMLDivElement)
            scenarioBtn.onclick = () => {
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
                scenarioBtn.disabled = true;
            };
}

export function enableUI() {
    const customTestBtn = document.querySelector("#customTestBtn");
    if (customTestBtn instanceof HTMLButtonElement)
        customTestBtn.disabled = false;
    const scenarioBtn = document.querySelector("#generateScenariosBtn");
    if (scenarioBtn instanceof HTMLButtonElement) scenarioBtn.disabled = false;
}

(function () {
    const dialog = document.querySelector("#customTestDialog");
    const customTestBtn = document.querySelector("#customTestBtn");
    if (dialog instanceof HTMLDialogElement) {
        dialog.onclick = (event) => {
            var rect = dialog.getBoundingClientRect();
            var isInDialog =
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width;
            if (!isInDialog) {
                dialog.close();
            }
        };
        if (customTestBtn instanceof HTMLButtonElement)
            customTestBtn.onclick = () => {
                dialog.showModal();
            };
    }
    const resetBtn = document.querySelector("#resetBtn");
    if (resetBtn instanceof HTMLButtonElement)
        resetBtn.onclick = () => {
            resetBtn.disabled = true;
            // @ts-ignore
            ldb.clear(() => {
                window.location.href = window.location.pathname;
            });
        };
    const runBtn = document.querySelector("#runCustomTestBtn");
    const iParamInput = document.querySelector("#iParam");
    const nParamInput = document.querySelector("#nParam");
    const bParamInput = document.querySelector("#bParam");
    const pParamInput = document.querySelector("#pParam");
    const rParamInput = document.querySelector("#rParam");
    const tParamInput = document.querySelector("#tParam");
    function inputValueOrDefault(input, defaultValue) {
        return input instanceof HTMLInputElement && input.value !== ""
            ? input.value
            : defaultValue;
    }
    if (runBtn instanceof HTMLButtonElement)
        runBtn.onclick = (e) => {
            e.preventDefault();
            const iValue = inputValueOrDefault(iParamInput, "1");
            const nValue = inputValueOrDefault(nParamInput, "128");
            const bValue = inputValueOrDefault(bParamInput, "1");
            const pValue = inputValueOrDefault(pParamInput, "proton");
            const rValue = inputValueOrDefault(rParamInput, "all_raw");
            const tValue = inputValueOrDefault(tParamInput, "0.5");
            const result = {
                i: Array.from({ length: parseInt(iValue) }, (_, i) => i),
                n: nValue.split(",").map((n) => parseInt(n)),
                b: bValue.split(",").map((b) => parseInt(b)),
                p: pValue.split(","),
                r: rValue.split(","),
                t: tValue.split(",").map((t) => parseFloat(t)),
            };
            const urlParams = zipObjectToParams(result);
            window.location.search = `${urlParams}`;
        };
})();
