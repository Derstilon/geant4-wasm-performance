import { fullParamsToURLKey, getFullParams } from "./params.js";
// @ts-ignore
navigator.sayswho = (function () {
    var ua = navigator.userAgent;
    // @ts-ignore
    var brands = navigator?.userAgentData?.brands;
    var tem;
    var M =
        ua.match(
            /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i,
        ) || [];
    if (brands && brands[2].brand === "Vivaldi") {
        return `${brands[2].brand}_${brands[2].version}`;
    }
    if (brands && brands[1].brand === "Microsoft Edge") {
        return `Edge_${brands[1].version}`;
    }
    if (brands && brands[0].brand === "Opera") {
        return `Opera_${brands[0].version}`;
    }
    if (ua.indexOf("Edg") > -1) {
        return `Edge_${
            window.navigator.userAgent
                .split("Edg/")[1]
                .split(" ")[0]
                .split(".")[0]
        }`;
    }
    if (ua.indexOf("Mozilla") > -1) {
        return `Firefox_${
            window.navigator.userAgent
                .split("Mozilla/")[1]
                .split(" ")[0]
                .split(".")[0]
        }`;
    }
    if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return "IE_" + (tem[1] || "");
    }
    if (M[1] === "Chrome") {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem != null) return tem.slice(1).join("_").replace("OPR", "Opera");
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, "-?"];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    return M.join("_");
})();
const testResults = {};
export function getTestResults() {
    return testResults;
}
export function storeFullParams(testParams = new URLSearchParams()) {
    const fullParams = getFullParams(testParams);
    Object.assign(testResults, fullParams);
    // @ts-ignore
    testResults.browser = navigator.sayswho;
    // store window resolution and display refresh rate
    testResults.resolution = `${window.screen.width}x${window.screen.height}`;
}
export function increaseStoredNumber(key, delta = 1) {
    if (!testResults[key]) testResults[key] = 0;
    testResults[key] += delta;
}
export function storeLogs(key, data) {
    if (!testResults[key]) testResults[key] = [];
    testResults[key].push(data);
}
export function saveResultsToLocalStorage(
    data = testResults,
    stringData = JSON.stringify(testResults),
    callback = (resolve) => {},
) {
    const key = `${fullParamsToURLKey(data)}`;
    // @ts-ignore
    ldb.set(key, stringData, callback);
}
