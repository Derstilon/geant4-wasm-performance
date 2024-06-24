// Import function from tje render.js file
import { initializeWebWorker } from "./test.js";

function logLocalStorageInBody() {
    // add data from local storage to body as a list
    const paramsDiv = document.querySelector("#params");
    if (paramsDiv)
        Object.entries(localStorage)
            .sort((a, b) => b[1] - a[1])
            .forEach(([key, value]) => {
                const p = document.createElement("p");
                p.innerHTML = `${key}<br\>${new Date(
                    Math.round(
                        JSON.parse(value).testInit + performance.timeOrigin,
                    ),
                ).toLocaleString()}`;
                paramsDiv.appendChild(p);
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
    return Array.from({ length }, (_, i) =>
        numberFn(i)
            .toLocaleString("en-US", {
                useGrouping: true,
            })
            .replaceAll(",", "_"),
    );
}
function generateTestScenarios() {
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
                t: ["24", "60", "120"],
            },
        },
        {
            name: "All protons scenario",
            params: {
                i: localeNumberArray(20),
                n: localeNumberArray(9, (i) => 4 ** i),
                b: localeNumberArray(10, (i) => 2 ** i),
                p: ["proton"],
                r: ["all_raw, all_processed"],
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
            name: "Test scenario",
            params: {
                i: ["0"],
                n: ["1", "4"],
                b: ["1", "2"],
                p: ["proton"],
                r: ["new_raw"],
                t: ["24"],
            },
        },
    ];

    for (const { name, params } of testScenarios) {
        const button = document.createElement("button");
        button.innerHTML = name;
        button.onclick = () => {
            const urlParams = zipObjectToParams(params);
            window.location.search = urlParams.toString();
        };
        testDiv.appendChild(button);
    }
}
function refreshForNextTest(urlParams) {
    const newUrl = `${window.location.pathname}?${urlParams}`;
    console.log(newUrl);
    setTimeout(() => {
        window.location.href = newUrl;
    }, 150);
}
function initializeTestRun(urlParams) {
    initializeWebWorker(urlParams)
        .then((value) => {
            console.log(value);
        })
        .catch((error) => {
            console.error(error);
        });
}
function prepareTestFromParams() {
    const scenarioBtn = document.querySelector("#generateScenariosBtn");
    if (scenarioBtn && scenarioBtn instanceof HTMLButtonElement)
        scenarioBtn.onclick = generateTestScenarios;
    // Get the current URL search params
    const params = zipObjectFromParams();
    let testParams = new URLSearchParams();
    let newRecord = Object.entries(params).some(([key, value]) => {
        testParams = zipObjectToParams(params, true);
        value.push(value.shift());
        if (localStorage.getItem(`${testParams}`) !== null) {
            testParams = zipObjectToParams(params, true);
            if (localStorage.getItem(`${testParams}`) !== null) {
                value.unshift(value.pop());
                return false;
            }
        }

        localStorage.setItem(
            `${testParams}`,
            JSON.stringify({
                testInit: performance.now(),
            }),
        );
        return true;
    });

    if (newRecord) {
        initializeTestRun(testParams);
        logLocalStorageInBody();
        //update the url with the remaining params
        // refreshForNextTest(zipObjectToParams(params));
    }
}
window.onload = prepareTestFromParams;
