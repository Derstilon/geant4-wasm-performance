import { getFullParams } from "./params.js";
// @ts-ignore
navigator.sayswho = (function () {
    var ua = navigator.userAgent;
    var tem;
    var M =
        ua.match(
            /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i,
        ) || [];
    if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return "IE " + (tem[1] || "");
    }
    if (M[1] === "Chrome") {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem != null) return tem.slice(1).join(" ").replace("OPR", "Opera");
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, "-?"];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    return M.join(" ");
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
export function saveResultsToLocalStorage(key) {
    // @ts-ignore
    ldb.set(key, JSON.stringify(testResults));
}
