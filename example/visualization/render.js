import {
    getQueueSize,
    getSimulatedTrackEntries,
    handleDataUntilEmpty,
    handleDataUntilTimeStamp,
    isQueueEmpty,
    optimizeTrackData,
} from "./data.js";
import { getTestResults, increaseStoredNumber, storeLogs } from "./logger.js";
import { getFullParams } from "./params.js";
import { getSimulationStatus } from "./simulation.js";
let canvas, gl, program, colorPalette, colorGenerator;
const MINIMAL_DISTANCE = 0.005;
const ROTATION_SPEED = -0.1;
const eyePerspective = {
    x: 360,
    y: 75,
    z: 110,
};
// Initialize WebGL
function initializeWebGL() {
    canvas = document.getElementById("glcanvas");
    // @ts-ignore
    gl = glUtils.checkWebGL(canvas);

    // @ts-ignore
    var vertexShader = glUtils.getShader(
            gl,
            gl.VERTEX_SHADER,
            // @ts-ignore
            glUtils.SL.Shaders.v1.vertex,
        ),
        // @ts-ignore
        fragmentShader = glUtils.getShader(
            gl,
            gl.FRAGMENT_SHADER,
            // @ts-ignore
            glUtils.SL.Shaders.v1.fragment,
        );

    // @ts-ignore
    program = glUtils.createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);
}
// Window Resizer
function resizer() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    // @ts-ignore
    render();
}

// Generate Color
function* generateColor() {
    const opacity = 1.0;
    const rgbValue = (angle) => {
        if (angle < 60) return 1.0;
        if (angle < 120) return 1.0 - (angle - 60.0) / 60;
        if (angle < 240) return 0.0;
        if (angle < 300) return (angle - 240.0) / 60;
        return 1.0;
    };
    const rValue = (angle) => rgbValue(angle % 360);
    const gValue = (angle) => rgbValue((angle + 120) % 360);
    const bValue = (angle) => rgbValue((angle + 240) % 360);

    let prevAmountOfSteps = 0;
    let amountOfSteps = 3;
    let colorIndex = 0;
    let stepSize = 360.0 / amountOfSteps;
    let angle = 0;
    while (amountOfSteps < 360) {
        yield [rValue(angle), gValue(angle), bValue(angle), opacity];
        colorIndex++;
        if (colorIndex >= amountOfSteps) {
            const tmp = prevAmountOfSteps;
            prevAmountOfSteps = amountOfSteps;
            amountOfSteps += tmp;
            colorIndex = 0;
            stepSize = 360.0 / amountOfSteps;
            angle += stepSize * 1.5;
        } else {
            angle += stepSize;
        }
    }
    return [1.0, 0.0, 0.0, opacity];
}

// Assign Color
export function assignColor(particle) {
    if (colorGenerator === undefined || colorPalette === undefined)
        throw new Error(
            `Color Generator ${colorGenerator} or Palette ${colorPalette} not initialized`,
        );
    if (colorPalette.has(particle)) return;
    const color = colorGenerator.next().value;
    colorPalette.set(particle, color);
}

// Initialize Color Palette
function initializeColorPalette() {
    const mainParticles = [
        "proton",
        "e+",
        "gamma",
        "e-",
        "neutron",
        "alpha",
        "deuteron",
        "He3",
        "triton",
        "B10",
    ];
    colorPalette = new Map();
    colorGenerator = generateColor();
    mainParticles.forEach((particle) => assignColor(particle));
}

// Initialize Buffers
function initializeBuffers(data) {
    let dim = 3;
    // define vertices in 3d space
    var vertices = new Float32Array(data);
    // The number of vertices
    var n = data.length / dim;

    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log("Failed to create the buffer object");
        return -1;
    }

    // Bind the buffer object to target
    // target: ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // Write date into the buffer object
    // target, size
    // usage: STATIC_DRAW, STREAM_DRAW, DYNAMIC_DRAW
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    var a_Position = gl.getAttribLocation(program, "a_Position");
    if (a_Position < 0) {
        console.log("Failed to get the storage location of a_Position");
        return -1;
    }

    // Assign the buffer object to a_Position variable
    // https://www.khronos.org/opengles/sdk/docs/man/xhtml/glVertexAttribPointer.xml
    // index, size, type, normalized, stride, pointer
    gl.vertexAttribPointer(a_Position, dim, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    return n;
}

function createPerspectiveMatrix(fovy, aspect, near, far) {
    // @ts-ignore
    const out = mat4.create();
    // @ts-ignore
    mat4.perspective(out, fovy, aspect, near, far);
    return out;
}
const boundingBoxData = [];
function withBoundingBox(width, height, depth, trackEntries) {
    if (boundingBoxData.length === 0) {
        // add edges and side diagonals of the bounding box to the track entries
        // the bounding box is centered at the origin
        // the bounding box is axis-aligned
        const [halfWidth, halfHeight, halfDepth] = [
            width / 2,
            height / 2,
            depth / 2,
        ];
        //generate all the edges of the bounding box
        const corners = [
            [-halfWidth, -halfHeight, -halfDepth],
            [-halfWidth, halfHeight, halfDepth],
            [halfWidth, halfHeight, -halfDepth],
            [halfWidth, -halfHeight, halfDepth],
        ];
        const boundingBox = [];
        for (let direction of [
            [-1, 1, 1],
            [1, -1, 1],
            [1, 1, -1],
        ])
            for (let corner of corners)
                boundingBox.push([
                    ...corner,
                    corner[0] * direction[0],
                    corner[1] * direction[1],
                    corner[2] * direction[2],
                ]);
        for (let [diagonalStart, diagonalEnd] of [
            [0, 1],
            [0, 2],
            [0, 3],
            [1, 2],
            [1, 3],
            [2, 3],
        ])
            boundingBox.push([
                ...corners[diagonalStart],
                ...corners[diagonalEnd],
            ]);

        boundingBox.forEach((edge) =>
            boundingBoxData.push([
                "bounding-box",
                [edge, [0.6, 0.6, 0.6, 1.0]],
            ]),
        );
    }
    return boundingBoxData.concat(trackEntries);
}

function addAxis(trackEntries) {
    trackEntries.push(
        [
            "x-axis",
            [
                [150, 0, 0, -150, 0, 0],
                [1.0, 1.0, 1.0, 1.0],
            ],
        ],
        [
            "y-axis",
            [
                [0, 100.0, 0, 0, -100.0, 0],
                [1.0, 1.0, 1.0, 1.0],
            ],
        ],
        [
            "z-axis",
            [
                [0, 0, 150.0, 0, 0, -150.0],
                [1.0, 1.0, 1.0, 1.0],
            ],
        ],
    );
}
/**
 * Render the track entries
 * @param {Set<String>|null} trackLabels
 * @param {Boolean} clearPrevious
 */
function render(trackLabels = null, clearPrevious = true, timeStamp = 0) {
    if (clearPrevious) {
        trackLabels = null;
    } else {
        timeStamp = 0;
    }
    let trackEntries;
    if (clearPrevious) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        trackEntries = withBoundingBox(
            50,
            50,
            50,
            getSimulatedTrackEntries(trackLabels),
        );
    } else {
        trackEntries = getSimulatedTrackEntries(trackLabels);
    }

    // Create a projection matrix
    const fov = Math.PI / 4; // 45 degrees field of view in radians
    const aspect = canvas.width / canvas.height; // Aspect ratio
    const near = 0.1; // Near clipping plane
    const far = 1000.0; // Far clipping plane
    const projectionMatrix = createPerspectiveMatrix(fov, aspect, near, far);

    // Pass the projection matrix to u_ProjectionMatrix
    const u_ProjectionMatrix = gl.getUniformLocation(
        program,
        "u_ProjectionMatrix",
    );
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projectionMatrix);

    // Create a view matrix
    // @ts-ignore
    let viewMatrix = mat4.lookAt(
        // @ts-ignore
        mat4.create(),
        // @ts-ignore
        vec3.fromValues(eyePerspective.x, eyePerspective.y, eyePerspective.z),
        // @ts-ignore
        vec3.fromValues(0, 0, 0),
        // @ts-ignore
        vec3.fromValues(0, 1, 0),
    );
    // rotate the view matrix based on the time
    // @ts-ignore
    viewMatrix = mat4.rotateY(
        viewMatrix,
        viewMatrix,
        (ROTATION_SPEED * timeStamp) / 1000,
    );

    // Pass the view matrix to u_ViewMatrix
    const u_ViewMatrix = gl.getUniformLocation(program, "u_ViewMatrix");
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix);

    // Iterate over the track entries
    for (let [_label, [data, colorId]] of trackEntries) {
        if (data.length === 0) continue;
        const color = colorPalette.has(colorId)
            ? colorPalette.get(colorId)
            : colorId;

        // Set the color
        const u_FragColor = gl.getUniformLocation(program, "u_FragColor");
        gl.uniform4f(u_FragColor, ...color);

        // Write the positions of vertices to a vertex shader
        let n = initializeBuffers(data);
        if (n < 0) {
            console.log("Failed to set the positions of the vertices");
            return;
        }

        // Draw the track
        gl.drawArrays(gl.LINE_STRIP, 0, n);
    }
}

function visualizationStep(
    prevTimeStamp,
    currentTimeStamp,
    shouldClear,
    shouldOptimize,
    targetFrames,
    endCallback,
) {
    if (getSimulationStatus() !== "pending") {
        const handleStart = performance.now();
        // Use targetFrames (per second), prevTimeStamp and currentTimeStamp to assume max time for handling

        const boundTime =
            targetFrames > 0 ? prevTimeStamp + 1000 / targetFrames : null;
        const newData = boundTime
            ? handleDataUntilTimeStamp(boundTime)
            : handleDataUntilEmpty();
        const optimizeStart = shouldOptimize ? performance.now() : null;
        if (shouldOptimize) optimizeTrackData(newData);
        const renderStart = newData.size ? performance.now() : null;
        if (newData.size) render(newData, shouldClear, currentTimeStamp);
        const stepEnd = performance.now();
        storeLogs("stepLogs", {
            handleStart,
            optimizeStart,
            renderStart,
            stepEnd,
            remainingMessages: getQueueSize(),
        });
        increaseStoredNumber(
            "handleTime",
            (optimizeStart ?? renderStart ?? stepEnd) - handleStart,
        );
        if (optimizeStart)
            increaseStoredNumber(
                "optimizeTime",
                (renderStart ?? stepEnd) - optimizeStart,
            );
        if (renderStart) {
            increaseStoredNumber("renderTime", stepEnd - renderStart);
            increaseStoredNumber("frameCount");
        }
    }
    if (
        getSimulationStatus() === "finished" &&
        isQueueEmpty() &&
        getTestResults()["messageCount"] ===
            getTestResults()["numberOfSimulatedEvents"]
    )
        return endCallback();
    requestAnimationFrame((timeStamp) =>
        visualizationStep(
            currentTimeStamp,
            timeStamp,
            shouldClear,
            shouldOptimize,
            targetFrames,
            endCallback,
        ),
    );
}

export function startVisualization(testParams = new URLSearchParams()) {
    return new Promise((resolve) => {
        const { dataHandling, targetFrames } = getFullParams(testParams);
        // @ts-ignore
        glUtils.SL.init({
            callback: function () {
                initializeWebGL();
                initializeColorPalette();
                resizer();
                window.addEventListener("resize", resizer);
                console.log("Visualization started");
                const handlingConfig = dataHandling.split("_");
                const shouldClear = handlingConfig[0] === "all";
                const shouldOptimize = handlingConfig[1] === "optimized";
                if (handlingConfig[0] === "none") return resolve(true);
                requestAnimationFrame((timeStamp) =>
                    visualizationStep(
                        null,
                        timeStamp,
                        shouldClear,
                        shouldOptimize,
                        targetFrames,
                        resolve,
                    ),
                );
            },
        });
    });
}

export function getMinimalDistance() {
    return MINIMAL_DISTANCE;
}
