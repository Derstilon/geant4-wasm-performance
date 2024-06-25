import { getFullParams } from "./params.js";
const testResults = {};
export function getTestResults() {
    return testResults;
}
export function storeFullParams(testParams = {}) {
    const fullParams = getFullParams(testParams);
    Object.assign(testResults, fullParams);
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
