import { storeLogs } from "./logger.js";
import { assignColor, getMinimalDistance } from "./render.js";

class Queue {
    constructor() {
        this.items = {};
        this.frontIndex = 0;
        this.backIndex = 0;
    }
    enqueue(item) {
        this.items[this.backIndex] = item;
        this.backIndex++;
        return item + " inserted";
    }
    dequeue() {
        const item = this.items[this.frontIndex];
        delete this.items[this.frontIndex];
        this.frontIndex++;
        return item;
    }
    peek() {
        return this.items[this.frontIndex];
    }
    get printQueue() {
        return this.items;
    }
}
const simulatedTracks = new Map();
const newDataQueue = new Queue();
function dequeueData() {
    if (newDataQueue.peek() === undefined) return null;
    return newDataQueue.dequeue();
}
function handleMessageData(messageData) {
    const labels = new Set();
    messageData.forEach((step) => {
        const [rawEvent, rawParticle, rawTrack, rawPosition] = step.split(",");
        const position = rawPosition
            .split(":")
            .map((string) => Number.parseFloat(string.trim()));
        const [event, track] = [rawEvent, rawTrack].map((string) =>
            Number.parseInt(string.trim()),
        );
        const particle = rawParticle.trim();
        const label = `${event}-${track}-${particle}`;
        if (simulatedTracks.has(label)) {
            simulatedTracks.get(label)[0].push(...position);
            return;
        }
        assignColor(particle);
        simulatedTracks.set(label, [[...position], particle]);
        labels.add(label);
    });
    return labels;
}
function getDistance(x1, y1, z1, x2, y2, z2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
}
function getPerpendicularDistance(x1, y1, z1, x2, y2, z2, x, y, z) {
    const lineVec = [x2 - x1, y2 - y1, z2 - z1];
    const pointVec = [x - x1, y - y1, z - z1];
    const lineLen = Math.sqrt(
        lineVec[0] ** 2 + lineVec[1] ** 2 + lineVec[2] ** 2,
    );
    const dotProduct =
        pointVec[0] * lineVec[0] +
        pointVec[1] * lineVec[1] +
        pointVec[2] * lineVec[2];
    const projLen = dotProduct / lineLen;
    const projVec = [
        (lineVec[0] * projLen) / lineLen,
        (lineVec[1] * projLen) / lineLen,
        (lineVec[2] * projLen) / lineLen,
    ];
    const perpVec = [
        pointVec[0] - projVec[0],
        pointVec[1] - projVec[1],
        pointVec[2] - projVec[2],
    ];
    return Math.sqrt(perpVec[0] ** 2 + perpVec[1] ** 2 + perpVec[2] ** 2);
}
function isVisible(trackPoints) {
    if (trackPoints.length < 6) return false; // Less than 2 points (6 coordinates) can't be a trajectory
    const trackEdges = trackPoints.slice(0, 3).concat(trackPoints.slice(-3));
    const minimalDistance = getMinimalDistance();
    const trackDistance = getDistance(...trackEdges);
    return minimalDistance < trackDistance;
}
function getOptimizedTrackData(trackPoints) {
    if (trackPoints.length < 9) return false; // Less than 3 points (9 coordinates) can't be unoptimized
    const newPoints = trackPoints.slice(0, 3);
    const minimalAngle = getMinimalDistance();
    for (let i = 3; i < trackPoints.length - 6; i += 3) {
        const prevPoint = trackPoints.slice(i - 3, i);
        const nextPoint = trackPoints.slice(i, i + 3);
        const currPoint = trackPoints.slice(i + 3, i + 6);
        // get perpendicular distance from the line to the point
        const perpDist = getPerpendicularDistance(
            ...prevPoint,
            ...nextPoint,
            ...currPoint,
        );
        if (perpDist > minimalAngle) {
            newPoints.push(...currPoint);
        }
    }
    newPoints.push(...trackPoints.slice(-3));
    return newPoints;
}
export function getSimulatedTrackEntries(labels) {
    const trackEntries = Array.from(simulatedTracks.entries());
    if (labels === null) return trackEntries;
    return trackEntries.filter(([label]) => labels.has(label));
}
export function enqueueData(data) {
    return newDataQueue.enqueue(data);
}
export function isQueueEmpty() {
    return newDataQueue.peek() === undefined;
}
export function getQueueSize() {
    return newDataQueue.backIndex - newDataQueue.frontIndex;
}
function handleDataUntilCondition(conditionFn) {
    const newTrackLabels = new Set();
    let message = dequeueData();
    while (message !== null) {
        handleMessageData(message.payload).forEach((label) =>
            newTrackLabels.add(label),
        );
        storeLogs("messageLogs", {
            sendTime: message.sendTime,
            receiveTime: message.receiveTime,
            handleTime: performance.now(),
            packageSize: message.packageSize,
        });
        if (conditionFn()) break;
        message = dequeueData();
    }
    return newTrackLabels;
}
export const handleDataUntilEmpty = () =>
    handleDataUntilCondition(isQueueEmpty);

export const handleDataUntilTimeStamp = (boundTime) =>
    handleDataUntilCondition(() => boundTime < performance.now());

export function optimizeTrackData(trackLabels) {
    trackLabels.forEach((label) => {
        const track = simulatedTracks.get(label);
        if (!isVisible(track[0])) {
            simulatedTracks.delete(label);
            return;
        }
        track[0] = getOptimizedTrackData(track[0]);
    });
}
