// @ts-nocheck
(function (global) {
    // CONFIG VARIABLES
    let RENDER_THRESHOLD = 0.01,
        EVENT_COUNT = 1000,
        BEAM = 1,
        RUNNING_FLAG = false,
        PERSPECTIVE = 0,
        TARGET_FPS = 90,
        DISPLAY_STATS = true;

    // GLOBAL VARIABLES
    let runButton,
        saveButton,
        canvas,
        perspectiveButtons,
        gl,
        program,
        counter,
        colorsLegend,
        inputRenderThreshold,
        simulatedEventsRequest,
        logInterval;

    const particleOptions = [
        ["proton", "60 MeV"],
        ["e+", "6 MeV"],
    ];

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

    // Initialize WebGL Utilities
    glUtils.SL.init({ callback: main });

    // Main Initialization Function
    function main() {
        initializeUIElements();
        initializeWebGL();
        resizer();
        window.addEventListener("resize", resizer);
    }

    // Initialize UI Elements
    function initializeUIElements() {
        runButton = document.querySelector("#run-btn");
        if (runButton) runButton.addEventListener("click", handleClick);

        saveButton = document.querySelector("#save-btn");
        if (saveButton)
            saveButton.addEventListener("click", () => saveLogFile());

        // Attach function to global scope
        window.saveLogFile = saveLogFile;

        inputRenderThreshold = document.querySelector("#input-threshold");
        if (inputRenderThreshold) {
            inputRenderThreshold.value = RENDER_THRESHOLD;
            inputRenderThreshold.addEventListener("change", (event) => {
                RENDER_THRESHOLD = event.target.value;
            });
        }

        perspectiveButtons = document.querySelectorAll(
            "#perspective-header > button",
        );
        if (perspectiveButtons && perspectiveButtons.length > 0) {
            perspectiveButtons.forEach((button, index) => {
                button.addEventListener("click", () => {
                    PERSPECTIVE = index;
                    draw();
                });
            });
        }

        simulatedEventsRequest = document.querySelector("#input-events");
        if (simulatedEventsRequest) {
            simulatedEventsRequest.value = EVENT_COUNT;
            simulatedEventsRequest.addEventListener("change", (event) => {
                EVENT_COUNT = Math.round(event.target.value);
                EVENT_COUNT = EVENT_COUNT <= 0 ? 1 : EVENT_COUNT;
                simulatedEventsRequest.value = EVENT_COUNT;
            });
        }

        counter = document.getElementById("events-count");
        colorsLegend = document.getElementById("particle-colors");
    }

    // Initialize WebGL
    function initializeWebGL() {
        canvas = document.getElementById("glcanvas");
        gl = glUtils.checkWebGL(canvas);

        var vertexShader = glUtils.getShader(
                gl,
                gl.VERTEX_SHADER,
                glUtils.SL.Shaders.v1.vertex,
            ),
            fragmentShader = glUtils.getShader(
                gl,
                gl.FRAGMENT_SHADER,
                glUtils.SL.Shaders.v1.fragment,
            );

        program = glUtils.createProgram(gl, vertexShader, fragmentShader);

        gl.useProgram(program);
    }

    // Window Resizer
    function resizer() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        draw();
    }

    let state = {
        eye: [
            {
                x: 360,
                y: 30,
                z: 110,
            },
            {
                x: 660,
                y: 180,
                z: 410,
            },
            {
                x: 0,
                y: 0,
                z: 500,
            },
            {
                x: 0.1,
                y: 450,
                z: -0.1,
            },
            {
                x: 500,
                y: 0,
                z: 0,
            },
        ],
        simulatedTrajectories: {},
        colorPalette: {},
        particleCounter: {},
        eventCount: 0,
        skippedFrames: 0,
        totalRenderTime: 0,
        totalReceiveMessageTime: 0,
        totalParseTrajectoryTime: 0,
        trackCount: 0,
        framesCount: 0,
        messageAmount: 0,
        log: {
            messages: new Array(),
            optimizations: new Array(),
            framesPerSecond: new Array(),
            messagesPerSecond: new Array(),
            eventsPerSecond: new Array(),
            tracksPerSecond: new Array(),
        },
    };

    const encoder = new TextEncoder(); // TextEncoder is part of the Encoding API and encodes a string into bytes using UTF-8
    const messageQueue = new Array();

    function initBuffers(data) {
        let dim = 3;
        // define vertices in 3d space
        var vertices = new Float32Array(data);
        // The number of vertices
        var n = data.length / dim;
        // var n = 5;

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

        var aPosition = gl.getAttribLocation(program, "aPosition");
        if (aPosition < 0) {
            console.log("Failed to get the storage location of aPosition");
            return -1;
        }

        // Assign the buffer object to a_Position variable
        // https://www.khronos.org/opengles/sdk/docs/man/xhtml/glVertexAttribPointer.xml
        // index, size, type, normalized, stride, pointer
        gl.vertexAttribPointer(aPosition, dim, gl.FLOAT, false, 0, 0);

        // Enable the assignment to a_Position variable
        gl.enableVertexAttribArray(aPosition);

        return n;
    }

    function createPerspectiveMatrix(fovy, aspect, near, far) {
        const out = mat4.create();
        mat4.perspective(out, fovy, aspect, near, far);
        return out;
    }

    // draw!
    function draw(
        clearPrevious = true,
        data_list = Object.values(state.simulatedTrajectories) ?? [],
    ) {
        data_list.push(
            [
                [150, 0, 0, -150, 0, 0],
                [1.0, 1.0, 1.0, 1.0],
            ],
            [
                [0, 100.0, 0, 0, -100.0, 0],
                [1.0, 1.0, 1.0, 1.0],
            ],
            [
                [0, 0, 150.0, 0, 0, -150.0],
                [1.0, 1.0, 1.0, 1.0],
            ],
        );

        if (clearPrevious) {
            // Specify the color for clearing <canvas>
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        // Create projection matrix
        const fovy = Math.PI / 4; // 45 degrees field of view
        const aspect = canvas.width / canvas.height; // Aspect ratio
        const near = 0.1; // Near clipping plane
        const far = 1000; // Far clipping plane
        const projectionMatrix = createPerspectiveMatrix(
            fovy,
            aspect,
            near,
            far,
        );

        // Pass the projection matrix to the shader
        const uProjectionMatrix = gl.getUniformLocation(
            program,
            "uProjectionMatrix",
        );
        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

        var mm = mat4.create();

        // lookAt -
        // out, eye, center, up
        // out = output matrix
        // eye = position of the "camera", or eyes, while "looking at" the center
        // center = the focal point, where we're looking
        // up = the "vertical" up direction from the center
        // var ex=0.25,ey=0.25,ez=1;
        mm = mat4.lookAt(
            mm,
            vec3.fromValues(
                state.eye[PERSPECTIVE].x,
                state.eye[PERSPECTIVE].y,
                state.eye[PERSPECTIVE].z,
            ),
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 1, 0),
        );
        var uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
        gl.uniformMatrix4fv(uViewMatrix, false, mm);

        for (let [data, colorId] of data_list) {
            if (data.length === 0) continue;
            const color = state.colorPalette[colorId] ?? colorId;
            // Get the location of the color uniform
            var uColor = gl.getUniformLocation(program, "uColor");
            if (!uColor) {
                console.log("Failed to get the storage location of uColor");
                return;
            }

            // Set the color uniform
            gl.uniform4f(uColor, color[0], color[1], color[2], color[3]);

            // Write the positions of vertices to a vertex shader
            var n = initBuffers(data);
            if (n < 0) {
                console.log("Failed to set the positions of the vertices");
                return;
            }

            // Draw a line
            gl.drawArrays(gl.LINE_STRIP, 0, n);
        }
    }

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

    let colorGenerator;

    function assignColorToParticle(particle) {
        const nextColor = colorGenerator.next();
        state.colorPalette[particle] = nextColor.value;
        if (!DISPLAY_STATS) return;
        const rgbColor = nextColor.value.map((v) => Math.round(v * 255));
        const colorBox = document.createElement("div");
        colorBox.style.backgroundColor = `rgba(${rgbColor.join(",")})`;
        colorBox.style.width = "22px";
        colorBox.style.height = "22px";
        colorBox.style.display = "inline-block";
        colorBox.style.marginRight = "5px";

        colorsLegend.appendChild(colorBox);
        colorsLegend.innerHTML += `Particle: ${particle}<br>`;
    }

    function updateMetric(time, total, marchingAmount, logs) {
        const elapsed =
            time - (logs[-1]?.elapsed ?? state.log.startTime ?? time);
        const newValues = total - (logs[-1]?.total ?? 0);
        logs.push({ time, elapsed, total, newValues });
        return [
            logs.slice(-marchingAmount).reduce(
                (a, { newValues: b, elapsed: c }) => ({
                    data: a.data + b,
                    time: a.time + c,
                }),
                { data: 0, time: 0 },
            ),
        ].map(({ data, time }) => Math.round((data / time) * 1000))[0];
    }

    function logMetrics(marchingAmount = 10) {
        const currentTime = Date.now();
        const FPS = updateMetric(
            currentTime,
            state.framesCount,
            marchingAmount,
            state.log.framesPerSecond,
        );
        const TPS = updateMetric(
            currentTime,
            state.trackCount,
            marchingAmount,
            state.log.tracksPerSecond,
        );
        const EPS = updateMetric(
            currentTime,
            state.eventCount,
            marchingAmount,
            state.log.eventsPerSecond,
        );
        if (!DISPLAY_STATS) return;

        counter.innerHTML = `${state.eventCount} events total : ${EPS} events/s`;
        counter.innerHTML += `<br>${state.trackCount} tracks total : ${TPS} tracks/s`;
        counter.innerHTML += `<br>${state.framesCount} frames total : ${FPS} frames/s`;
        counter.innerHTML += `<br>Optimizations: ${state.log.optimizations.length}`;
        counter.innerHTML += `<br>Removed line sections: ${state.log.optimizations.reduce(
            (a, { cutAmount }) => a + cutAmount,
            0,
        )}`;
        counter.innerHTML += `<br>Skiped frames: ${state.skippedFrames}`;
        counter.innerHTML += `<br>Total render time: ${state.totalRenderTime}ms`;
        counter.innerHTML += `<br>Total receive message time: ${state.totalReceiveMessageTime}ms`;
        counter.innerHTML += `<br>Total parse trajectory time: ${state.totalParseTrajectoryTime}ms`;
        counter.innerHTML += `<br>Total run time: ${
            (state.endTime ?? currentTime) - state.log.startTime
        }ms`;
    }

    function getDirection(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
        const vector1 = [x2 - x1, y2 - y1, z2 - z1];
        const vector2 = [x3 - x2, y3 - y2, z3 - z2];

        const crossProduct = [
            vector1[1] * vector2[2] - vector1[2] * vector2[1],
            vector1[2] * vector2[0] - vector1[0] * vector2[2],
            vector1[0] * vector2[1] - vector1[1] * vector2[0],
        ];

        const magnitude = Math.sqrt(
            crossProduct[0] ** 2 + crossProduct[1] ** 2 + crossProduct[2] ** 2,
        );
        return crossProduct.map((component) => component / magnitude);
    }

    function getDistance(x1, y1, z1, x2, y2, z2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
    }

    function shouldBeRendered(points) {
        if (points.length < 6) return false; // Less than 2 points (6 coordinates) can't be a trajectory

        // Get first 3 coords and last 3 coords in an array
        const coords = points.slice(0, 3).concat(points.slice(-3));
        const distance = getDistance(...coords);
        // if (distance > RENDER_THRESHOLD) console.log(distance);
        return distance > RENDER_THRESHOLD;
    }

    function optimizeTrajectories(points) {
        if (points.length < 9) return points; // Less than 3 points (9 coordinates)

        const optimized = [];
        let lastDirection = null;

        optimized.push(points[0], points[1], points[2]); // Add the first point

        for (let i = 3; i < points.length - 3; i += 3) {
            const direction = getDirection(
                points[i - 3],
                points[i - 2],
                points[i - 1], // Previous point
                points[i],
                points[i + 1],
                points[i + 2], // Current point
                points[i + 3],
                points[i + 4],
                points[i + 5], // Next point
            );
            if (!direction.equals(lastDirection)) {
                optimized.push(points[i], points[i + 1], points[i + 2]);
                lastDirection = direction;
            }
        }

        optimized.push(
            points[points.length - 3],
            points[points.length - 2],
            points[points.length - 1],
        ); // Add the last point
        return optimized;
    }

    Array.prototype.equals = function (array) {
        if (!array || this.length !== array.length) return false;
        for (let i = 0; i < this.length; i++) {
            if (this[i] !== array[i]) return false;
        }
        return true;
    };

    function handleMessage(messageData) {
        let tracksPerEvent = 0;
        const newLabels = new Set();
        messageData.forEach((d) => {
            const data = d.split(",");
            const position = data[3]
                .split(" : ")
                .map((v) => Number.parseFloat(v));
            const event = Number.parseInt(data[0]);
            const particle = data[1].trim();
            const track = Number.parseInt(data[2]);
            const label = `${event}-${track}`;
            state.eventCount = event + 1;
            if (track > tracksPerEvent) tracksPerEvent = track;
            else {
                state.trackCount += track + 1;
                tracksPerEvent = 0;
            }

            if (!(label in state.simulatedTrajectories)) {
                newLabels.add(label);
                // Generate a new color if this particle is not in the color_palette
                if (!(particle in state.colorPalette))
                    assignColorToParticle(particle);

                state.simulatedTrajectories[label] = [[], particle];
            }
            state.simulatedTrajectories[label][0].push(...position);
        });
        for (let label of newLabels) {
            const timeStart = Date.now();
            let trajectory = state.simulatedTrajectories[label][0];
            let cutAmount = trajectory.length;
            const particle = state.simulatedTrajectories[label][1];
            if (shouldBeRendered(trajectory)) {
                let optimized = optimizeTrajectories(trajectory);
                cutAmount -= optimized.length;
                trajectory = optimized;
                state.particleCounter[particle] ??= 0;
                state.particleCounter[particle]++;
            } else {
                trajectory = [];
            }
            const timeEnd = Date.now();
            state.log.optimizations.push({
                timeEnd,
                timeStart,
                cutAmount,
                particle,
            });
            state.simulatedTrajectories[label][0] = trajectory;
        }
        return newLabels;
    }

    function clearLogs() {
        state.simulatedTrajectories = {};
        state.colorPalette = {};
        state.particleCounter = {};
        state.eventCount = 0;
        state.trackCount = 0;
        state.framesCount = 0;
        state.log.messages = new Array();
        state.log.optimizations = new Array();
        state.log.framesPerSecond = new Array();
        state.log.eventsPerSecond = new Array();
        state.log.tracksPerSecond = new Array();
    }

    function stopMainLoop() {
        RUNNING_FLAG = false;
        runButton.innerHTML = "Done!";
        clearInterval(logInterval);
        logMetrics();
        setTimeout(() => {
            runButton.innerHTML = "Run simulation";
            runButton.disabled = false;
        }, 2000);
    }

    function startMainLoop() {
        RUNNING_FLAG = true;
        runButton.innerHTML = "Running...";
        clearInterval(logInterval);
        setTimeout(logMetrics);
        logInterval = setInterval(logMetrics, 200);
        mainLoop();
    }
    let renderTime = 0;
    let lastDrawEndTime = 0;
    function mainLoop() {
        if (messageQueue.length > 0) {
            // handle message queue
            const handleMessageStartTime = Date.now();
            const trajectoriesToRender = [];
            while (messageQueue.length > 0) {
                trajectoriesToRender.push(
                    ...handleMessage(messageQueue.shift()).keys(),
                );
            }
            state.totalParseTrajectoryTime +=
                Date.now() - handleMessageStartTime;
            if (
                // draw if the time since the last frame is greater than the render time
                Date.now() - lastDrawEndTime + renderTime >=
                1000 / TARGET_FPS
            ) {
                state.framesCount++;
                // draw the trajectories
                const drawStartTime = Date.now();
                draw(
                    false,
                    Object.entries(state.simulatedTrajectories)
                        .filter(([k, v]) => trajectoriesToRender.includes(k))
                        .map(([k, v]) => v),
                );
                lastDrawEndTime = Date.now();
                renderTime = lastDrawEndTime - drawStartTime;
                state.totalRenderTime += renderTime;
                //     // break handleLoop;
            } else {
                state.skippedFrames++;
            }
        }
        if (state.log.endTime === undefined || messageQueue.length > 0)
            setTimeout(mainLoop);
        else {
            draw();
            stopMainLoop();
        }
    }

    function handleClick(event) {
        state.log.startTime = Date.now();
        runButton.disabled = true;
        return new Promise((resolve) => {
            console.log(`Run simulation...`);
            console.log(`Waiting for runtime to be initialized...`);
            const worker = new Worker("worker.js");

            worker.onmessage = function (e) {
                const time = Date.now();
                switch (e.data.type) {
                    case "event":
                        clearLogs();
                        colorGenerator = generateColor();
                        colorsLegend.innerHTML = "";
                        mainParticles.forEach((particle) =>
                            assignColorToParticle(particle),
                        );
                        if (e.data.data === "onRuntimeInitialized") {
                            worker.postMessage(`
  /process/em/verbose 0
  /run/verbose 0
  /control/verbose 0

  /score/create/boxMesh boxMesh
  /score/mesh/boxSize 50. 50. 50. mm
  /score/mesh/nBin 1 1 1
  /score/quantity/energyDeposit eDep

  /score/close

  /run/initialize

  /process/em/verbose 0
  /run/verbose 0
  /control/verbose 0


  /gps/particle ${particleOptions[BEAM][0]}
  /gps/energy ${particleOptions[BEAM][1]}
  /gps/direction 0. 0. 1.
  /gps/position 0. 0. -2 cm

  /run/beamOn ${EVENT_COUNT}
`);
                            state.simulatedEvents = EVENT_COUNT;
                            state.renderThreshold = RENDER_THRESHOLD;
                            startMainLoop();
                        }
                        break;
                    case "render":
                        state.messageAmount++;
                        state.log.messages.push({
                            sendTime: e.data.time ?? null,
                            receiveTime: time,
                            packageSize: encoder.encode(
                                JSON.stringify(e.data.data),
                            ).length, // Get the length of the byte array, which is the byte size of the data
                        });
                        messageQueue.push(e.data.data);
                        state.totalReceiveMessageTime += Date.now() - time;
                        if (!RUNNING_FLAG) startMainLoop();
                        break;
                    case "exit":
                        state.log.endTime = Date.now();
                        console.log(state.log.eventsPerSecond);
                        console.log(state.log.messages);
                        console.log(messageQueue);
                        console.log(state.log);
                        break;
                    default:
                        // console.log(
                        //     `Worker ${index}: ${e.data.type} ${e.data.data}`,
                        // );
                        break;
                }
            };
        });
    }
    // Function to save JSON data as a file
    function saveLogFile(
        logData = state,
        fileName = "log.json",
        ignoredKeys = ["simulatedTrajectories", "eye", "colorPalette"],
    ) {
        const logDataCopy = JSON.parse(JSON.stringify(logData)); // Deep copy the log data
        for (const key of ignoredKeys) {
            delete logDataCopy[key];
        }
        const jsonStr = JSON.stringify(logDataCopy, null, 2); // Convert log data to JSON string with pretty printing
        const blob = new Blob([jsonStr], { type: "application/json" }); // Create a blob from the JSON string
        const url = URL.createObjectURL(blob); // Create a URL for the blob

        // Create an anchor element and trigger a download
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
})(window || this);
