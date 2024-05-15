(function (global) {
    let runButton, canvas, gl, program, counter, colorsLegend;
    let state = {
        eye: {
            x: 0.2,
            y: 0.25,
            z: 0.25,
        },
        simulatedTrajectories: {},
        colorPalette: {},
        eventCount: 0,
        trackCount: 0,
        framesCount: 0,
        log: {
            messages: new Array(),
            optimizations: new Array(),
            framesPerSecond: new Array(),
            eventsPerSecond: new Array(),
            tracksPerSecond: new Array(),
        },
    };

    let logInterval;

    const encoder = new TextEncoder(); // TextEncoder is part of the Encoding API and encodes a string into bytes using UTF-8
    const messageQueue = new Array();

    glUtils.SL.init({
        callback: function () {
            main();
        },
    });

    function initBuffers(data) {
        let dim = 3;
        // define vertices in 3d space
        var vertices = new Float32Array(data);
        // normalize data
        //   var vertices = new Float32Array([
        //     -0.5, -0.5,   -0.5, +0.5,  0.0, 0.0,  0.0, +0.5
        //     // -0.5, -0.5,   -0.5, +0.5,  0.0, 0.0,  0.0, +0.5,  +0.5, -0.5
        //   ]);
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

    // draw!
    function draw(data_list) {
        // console.log("Drawing...");
        // console.log(data_list);
        if (!data_list) {
            data_list = [
                [
                    [0.5, 0, 0, -0.5, 0, 0],
                    [0.0, 1.0, 1.0, 1.0],
                ],
                [
                    [0, 0.5, 0, 0, -0.5, 0],
                    [0.0, 1.0, 1.0, 1.0],
                ],
                [
                    [0, 0, 0.5, 0, 0, -0.5],
                    [0.0, 1.0, 1.0, 1.0],
                ],
            ];
        }
        // Specify the color for clearing <canvas>
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (let [data, colorId] of data_list) {
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
                vec3.fromValues(state.eye.x, state.eye.y, state.eye.z),
                vec3.fromValues(0, 0, 0),
                vec3.fromValues(0, 1, 0),
            );
            var uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
            gl.uniformMatrix4fv(uViewMatrix, false, mm);

            // Draw a line
            gl.drawArrays(gl.LINE_STRIP, 0, n);
        }
    }

    function resizer() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        draw();
    }

    function main() {
        // Register Callbacks
        runButton = document.querySelector("#run-btn");
        window.addEventListener("resize", resizer);
        if (runButton) runButton.addEventListener("click", handleClick);

        // Get canvas element and check if WebGL enabled
        canvas = document.getElementById("glcanvas");
        counter = document.getElementById("events-count");
        colorsLegend = document.getElementById("particle-colors");
        gl = glUtils.checkWebGL(canvas);

        // Initialize the shaders and program
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

        resizer();
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

    const colorGenerator = generateColor();

    function assignColorToParticle(particle) {
        const nextColor = colorGenerator.next();
        state.colorPalette[particle] = nextColor.value;
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
        counter.innerHTML = `${state.eventCount} events total : ${EPS} events/s`;
        counter.innerHTML += `<br>${state.trackCount} tracks total : ${TPS} tracks/s`;
        counter.innerHTML += `<br>${state.framesCount} frames total : ${FPS} frames/s`;
    }

    function handleMessage(messageData) {
        let tracksPerEvent = 0;
        messageData.forEach((d) => {
            const positionScale = 0.005;
            const data = d.split(",");
            const position = data[3]
                .split(" : ")
                .map((v) => Number.parseFloat(v) * positionScale);
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
                // Generate a new color if this particle is not in the color_palette
                if (!(particle in state.colorPalette))
                    assignColorToParticle(particle);

                state.simulatedTrajectories[label] = [[], particle];
            }
            state.simulatedTrajectories[label][0].push(...position);
        });
    }

    function mainLoop() {
        const startTime = Date.now();
        console.log(`Main loop...`);
        if (messageQueue.length > 0) {
            state.framesCount++;
            // handle message queue
            while (
                // Date.now() - startTime < 500 / 60 &&
                messageQueue.length > 0
            )
                handleMessage(messageQueue.shift());

            // draw the trajectories
            draw(Object.values(state.simulatedTrajectories));
        }

        if (state.log.endTime === undefined || messageQueue.length > 0)
            setTimeout(mainLoop);
        else {
            runButton.innerHTML = "Done!";
            clearInterval(logInterval);
            logMetrics();
        }
    }

    function handleClick(event) {
        state.log.startTime = Date.now();
        runButton.disabled = true;
        runButton.innerHTML = "Running...";
        setTimeout(logMetrics);
        logInterval = setInterval(logMetrics, 200);
        return new Promise((resolve) => {
            console.log(`Run simulation...`);
            console.log(`Waiting for runtime to be initialized...`);
            const worker = new Worker("worker.js");

            worker.onmessage = function (e) {
                const time = Date.now();
                switch (e.data.type) {
                    case "event":
                        if (e.data.data === "onRuntimeInitialized") {
                            worker.postMessage(simulationConf);
                            mainLoop();
                        }
                        break;
                    case "render":
                        state.log.messages.push({
                            sendTime: e.data.time ?? null,
                            receiveTime: time,
                            packageSize: encoder.encode(
                                JSON.stringify(e.data.data),
                            ).length, // Get the length of the byte array, which is the byte size of the data
                        });
                        messageQueue.push(e.data.data);
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
})(window || this);
