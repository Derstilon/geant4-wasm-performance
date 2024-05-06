(function (global) {
    var canvas, gl, program;
    var state = {
        eye: {
            x: 0.2,
            y: 0.25,
            z: 0.25,
        },
    };
    var data = [];
    let index = 0;

    glUtils.SL.init({
        callback: function () {
            main();
        },
    });

    function main() {
        // Register Callbacks
        const runButton = document.querySelector("#run-btn");
        window.addEventListener("resize", resizer);
        runButton.addEventListener("click", handleClick);

        // Get canvas element and check if WebGL enabled
        canvas = document.getElementById("glcanvas");
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
    let draw_data = {};

    function handleClick(event) {
        return new Promise((resolve) => {
            index++;
            console.log(`Run simulation ${index}`);
            console.log(`Waiting for runtime to be initialized...`);
            const worker = new Worker("worker.js");

            worker.onmessage = function (e) {
                switch (e.data.type) {
                    case "event":
                        if (e.data.data === "onRuntimeInitialized")
                            worker.postMessage(simulationConf);
                        break;
                    case "render":
                        e.data.data.forEach((d) => {
                            const label = d["event"] + "_" + d["track"];
                            if (!(label in draw_data)) draw_data[label] = [];
                            draw_data[label].push(d["x"], d["y"], d["z"]);
                        });

                        draw(Object.values(draw_data));
                        console.log(
                            `Worker ${index}: ${e.data.type} ${e.data.data.length}`,
                        );
                        break;
                    default:
                        console.log(
                            `Worker ${index}: ${e.data.type} ${e.data.data}`,
                        );
                }
            };
        });
    }

    // draw!
    function draw(data_list) {
        if (!data_list) {
            data_list = [
                [0.5, 0, 0, -0.5, 0, 0],
                [0, 0.5, 0, 0, -0.5, 0],
                [0, 0, 0.5, 0, 0, -0.5],
            ];
        }
        // Specify the color for clearing <canvas>
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (let data of data_list) {
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

        // Assign the buffer object to aPosition variable
        // https://www.khronos.org/opengles/sdk/docs/man/xhtml/glVertexAttribPointer.xml
        // index, size, type, normalized, stride, pointer
        gl.vertexAttribPointer(aPosition, dim, gl.FLOAT, false, 0, 0);

        // Enable the assignment to aPosition variable
        gl.enableVertexAttribArray(aPosition);

        return n;
    }

    function resizer() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        draw();
    }
})(window || this);
