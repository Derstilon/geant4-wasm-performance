import { zipObjectToParams } from "./index.js";
import { getHumanReadableParams } from "./params.js";

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
export function createDownloadableButtons() {
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

export function setCurrentTestTitle(title) {
    const header = document.querySelector("#currentTest");
    if (header) header.innerHTML = title;
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
        else scenarioBtn.disabled = true;
}

(function () {
    const dialog = document.querySelector("#customTestDialog");
    const customTestBtn = document.querySelector("#customTestBtn");
    if (dialog instanceof HTMLDialogElement) {
        console.log(dialog, customTestBtn);
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
            // @ts-ignore
            ldb.clear();
            window.location.href = window.location.pathname;
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
