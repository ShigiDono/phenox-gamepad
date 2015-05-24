require.config({
    shim: {
        'glUtils': {
            deps: ["sylvester"]
        },
        'glMatrix': {
            exports: ["mat4"]
        }
    }
});



require(["glMatrix"], function(gl_matrix) {
    $(document).ready(function() {
        console.log("a");
        var requestAnimationFrame =
            window.requestAnimationFrame        || 
            window.webkitRequestAnimationFrame  || 
            window.mozRequestAnimationFrame     || 
            window.oRequestAnimationFrame       ||
            function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() {
                    callback(currTime + timeToCall);
                }, timeToCall);
                lastTime = currTime + timeToCall;
                return id;
        };
        var detector = 0;
        var gl;
        var joystick_a, joystick_b;
        var current_shader;

        function initJoysticks() {
            joystick_a    = new VirtualJoystick({
                container   : document.body,
                strokeStyle : 'cyan',
                limitStickTravel: true,
                stickRadius : 120,  
            });
            joystick_a.addEventListener('touchStartValidation', function(event){
                var touch   = event.changedTouches[0];
                return touch.pageX < window.innerWidth/2;
            });

            // one on the right of the screen
            joystick_b    = new VirtualJoystick({
                container   : document.body,
                strokeStyle : 'orange',
                limitStickTravel: true,
                stickRadius : 120     
            });
            joystick_b.addEventListener('touchStartValidation', function(event){
                var touch   = event.changedTouches[0];
                return touch.pageX >= window.innerWidth/2;
            });
            console.log("touchscreen is", VirtualJoystick.touchScreenAvailable() ? "available" : "not available");

        }
        function getShader(theSource, type) {

            var shader;

            if (type == "fragment") {
                shader = gl.createShader(gl.FRAGMENT_SHADER);
            } else if (type == "vertex") {
                shader = gl.createShader(gl.VERTEX_SHADER);
            } else {
                return null;  // Unknown shader type
            }

            // Send the source to the shader object

            gl.shaderSource(shader, theSource);

            // Compile the shader program

            gl.compileShader(shader);

            // See if it compiled successfully

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
                return null;
            }

            return shader;
        }
        function shader(vertex_shader, fragment_shader) {
            this.fragmentShader = getShader("\
varying highp vec2 vTextureCoord;\n\
\n\
uniform sampler2D uSampler;\n\
precision highp float;\n\
\n\
vec3 rgb_to_hsv(vec3 RGB)\n\
{\n\
    float r = RGB.x;\n\
    float g = RGB.y;\n\
    float b = RGB.z;\n\
\n\
    float minChannel = min(r, min(g, b));\n\
    float maxChannel = max(r, max(g, b));\n\
\n\
    float h = 0.0;\n\
    float s = 0.0;\n\
    float v = maxChannel;\n\
\n\
    float delta = maxChannel - minChannel;\n\
\n\
    if (delta != 0.0) { \n\
        s = delta / v;\n\
\n\
        if (r == v) h = (g - b) / delta;\n\
        else if (g == v) h = 2.0 + (b - r) / delta;\n\
        else /* b == v */ h = 4.0 + (r - g) / delta;\n\
    }\n\
\n\
    return vec3(h, s, v);\n\
}\n\
\n\
\n\
void main(void) {\n\
    vec2 inv_size = vec2(1.0/128.0);\n\
    vec4 color = texture2D(uSampler, vTextureCoord);\n\
    vec3 hsv = rgb_to_hsv(color.xyz);\n\
    if (hsv.r > 1.5 || hsv.r < 1.0 || hsv.g < 0.2) {\n\
        color = vec4(0.0, 0.0, 0.0, /*hsv.b, hsv.b, hsv.b, */1.0);\n\
    }\n\
    gl_FragColor = color;\n\
}\n\
\n        ", "fragment");
            this.vertexShader = getShader("\
        attribute vec3 aVertexPosition;\
        attribute vec2 aTexture;\
        \
        varying vec2 vTextureCoord;\
        \
        void main(void) {\
        gl_Position = vec4(aVertexPosition, 1.0);\
        /*vColor = aVertexColor/*aVertexPosition.z/25.0;*/\
        vTextureCoord = aTexture;\
              }", "vertex");

            // Create the shader program

            this.shaderProgram = gl.createProgram();
            gl.attachShader(this.shaderProgram, this.vertexShader);
            gl.attachShader(this.shaderProgram, this.fragmentShader);
            gl.linkProgram(this.shaderProgram);

            // If creating the shader program failed, alert

            if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
                alert("Unable to initialize the shader program.");
            }

            gl.useProgram(this.shaderProgram);

            this.vertex = gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
            gl.enableVertexAttribArray(this.vertex);
            this.texture = gl.getAttribLocation(this.shaderProgram, "aTexture");
            gl.enableVertexAttribArray(this.texture);

            //this.color = gl.getAttribLocation(this.shaderProgram, "aVertexColor");
            //gl.enableVertexAttribArray(this.color);
            //this.pUniform = gl.getUniformLocation(this.shaderProgram, "uPMatrix");
            //this.mvUniform = gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
            this.samplerUniform = gl.getUniformLocation(this.shaderProgram, "uSampler");


        }

        function rect_buffer() {
            var vertices = [
                1,  -1, 0, 1, 0,
                -1, -1, 0, 1, 1,
                1,  1,  0, 0, 0,
                -1, 1,  0, 0, 1];
            this.vertex_buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

            var indices = [];

            this.index_buffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);

            for (var i = 0; i < 1; i++) {
                indices.push(
                    i*4 + 0, i*4 + 1, i*4 + 2,
                    i*4 + 2, i*4 + 1, i*4 + 3
                );
            }
            m = 0;
            for (var i = 0; i < indices.length; i++) {
                m = Math.max(m, indices[i]);
            }
            //console.log(m, indices.length);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        }
        rect_buffer.prototype.draw = function(current_shader, t) {
            if (!t) return;
            //gl.useProgram(current_shader.shaderProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
            gl.vertexAttribPointer(current_shader.vertex, 3, gl.FLOAT, false, 20, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
            gl.vertexAttribPointer(current_shader.t, 2, gl.FLOAT, false, 20, 12);//7*4, 3*4);

            //setMatrixUniforms(current_shader);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, t.texture);
            gl.uniform1i(current_shader.samplerUniform, 0);

            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);//gl.drawArrays(gl.TRIANGLES, 0, 9);//this.vertex_count);

        }
        var te;

        function texture(element) {
            this.my_img = new Image();
            this.my_img.width = 64;
            this.my_img.height = 64;
            this.my_img.src = element;
            this.texture = gl.createTexture();
            var self = this;
            this.my_img.onload = function() {
                gl.bindTexture(gl.TEXTURE_2D, self.texture);
                //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, self.my_img);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating).
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating).
                gl.bindTexture(gl.TEXTURE_2D, null);
            }

/*            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element); // This is the important line!
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            //gl.generateMipmap(gl.TEXTURE_2D);

            gl.bindTexture(gl.TEXTURE_2D, null);*/

            //gl.bindTexture(gl.TEXTURE_2D, null);

        }
        texture.prototype.update = function(element) {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating).
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating).
            gl.bindTexture(gl.TEXTURE_2D, null);
        }

        var rttFramebuffer;
        var rttTexture;

        function initTextureFramebuffer() {
            rttFramebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
            rttFramebuffer.width = 64;
            rttFramebuffer.height = 64;

            rttTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, rttTexture);
            gl.texParameteri( 
                gl.TEXTURE_2D,
                gl.TEXTURE_MAG_FILTER,
                gl.LINEAR );

            gl.texParameteri( 
                gl.TEXTURE_2D, 
                gl.TEXTURE_MIN_FILTER, 
                gl.LINEAR );

            gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);


            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);

            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        var canvas;
        function initWebGL() {
            function initGL(canvas) {
                gl = null;
                try {
                    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
                } catch (e) {

                }
                if (!gl) {
                    alert("Fail");
                    gl = null;
                } else {
                    gl.clearColor(0, 0, 0, 1);
                    gl.enable(gl.DEPTH_TEST);
                    gl.depthFunc(gl.LEQUAL);
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                    //gl.viewport(-1, 1, 2, 2);
                }
                return gl;
            }
            canvas = document.getElementById("overlay");

            var video = document.getElementById('video');

            function resizeCanvas() {
                /*var devicePixelRatio = window.devicePixelRatio || 1;
                canvas.width = window.innerWidth*devicePixelRatio;
                canvas.height = window.innerHeight*devicePixelRatio;*/
            }
            window.addEventListener('resize', resizeCanvas, false);
            gl = initGL(canvas);
            var mvMatrix = gl_matrix.mat4.create();
        }

        initJoysticks();
        initWebGL();

        var t = new rect_buffer();
        var s = new shader();
        initTextureFramebuffer();
        var pixelData = new Uint8Array(64*64*4);
        var target_x = 0;
        var target_y = 0;
        var target_x_final = 0;
        var target_y_final = 0;
        var ready_to_send = false;
        var target_weight = 0;

        var encoder;
        setTimeout(function() {encoder = new Whammy.Video(40); setTimeout(function() {
            var output = encoder.compile();
            console.log((window.webkitURL || window.URL).createObjectURL(output));
            encoder = null;
        }, 10000);}, 1000);

        function draw(time) {
            ti = Date.now()/1000.0;

            if (typeof te != "undefined" && typeof te.texture != "undefined") {
                gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
                gl.clear(gl.COLOR_BUFFER_BIT);
                t.draw(s, te);
                gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
                target_weight = 0;
                for (var x = 0; x < 64; x++) {
                    for (var y = 0; y < 64; y++) {
                        if (pixelData[(y*64+x)*4] != 0) {
                            target_weight++;
                            target_x += x;
                            target_y += y;
                        }
                    }
                }
                if (target_weight > 20) {
                    target_x_final = Math.max(-64, Math.min(64, target_x / target_weight)) - 32;
                    target_y_final = Math.max(-64, Math.min(target_y / target_weight)) - 32;
                    ready_to_send = true;
                } else {
                    ready_to_send = false;
                }
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
                t.draw(s, {texture:rttTexture});
                if (encoder) {
                    encoder.add(canvas);
                }
            }
            requestAnimationFrame(draw);
        }
        requestAnimationFrame(draw);


        var parser = document.createElement('a');
        parser.href = document.URL

        var ws = new WebSocket("ws://" + parser.hostname + ":3001");
        ws.binaryType = "arraybuffer";

        var elem;
        var go_up = null, go_down = null;
        ws.onopen = function(){    
            ws.onmessage = function(e) {
                var data = new Uint8Array(e.data);
                if (data[4] == 0) {
                    var src = URL.createObjectURL(new Blob([e.data.slice(5)]));
                    document.getElementById('video').src = src;
                    if (!te) {
                        te = new texture(src);
                    } else if (te.my_img) {
                        te.my_img.src = src;
                    }
                } else {

                }
            }
            ws.onerror = function(e) {
                console.error(e);
            }
            ws.onclose = function() {
                console.log("Socket closed");
            }
            setInterval(function(){
                var obj = {
                    a: {
                        dx: joystick_a.deltaX(),
                        dy: joystick_a.deltaY()
                    },
                    b: {
                        dx: joystick_b.deltaX(),
                        dy: joystick_b.deltaY()
                    }
                };
                if (ready_to_send) {
                    obj.a.dx = target_x_final*2;
                }
                ws.send(JSON.stringify(obj));
                if (joystick_b.deltaY() > 100) {
                    go_up = go_up || setTimeout(function() {
                        ws.send(JSON.stringify({
                            type: "command",
                            cmd: "down"
                        }))
                    }, 2000);
                } else if (go_up) {
                    clearTimeout(go_up);
                    go_up = null;
                }
                if (joystick_b.deltaY() < -100) {
                    go_down = go_down || setTimeout(function() {
                        ws.send(JSON.stringify({
                            type: "command",
                            cmd: "up"
                        }))
                    }, 2000);
                } else if (go_down) {
                    clearTimeout(go_down);
                    go_down = null;
                }
            }, 1/30 * 1000);
        }
        $(window).on('beforeunload', function(){
            ws.close();
        });
        function check_landscape() {
            if (window.innerHeight > window.innerWidth) {
                $("#landscape-alert").fadeIn();
            } else {
                $("#landscape-alert").fadeOut();
            }
        }
        check_landscape();
        $(window).resize(function() {
            check_landscape();
        });
        function toggleFullScreen() {
            var doc = window.document;
            var docEl = doc.documentElement;

            var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
            var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

            if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
                requestFullScreen.call(docEl);
            }
            else {
                //cancelFullScreen.call(doc);
            }
        }
        document.documentElement.addEventListener("mousedown", function(){
            toggleFullScreen();
        });
        document.documentElement.addEventListener("touchstart", function(){
            toggleFullScreen();
        });
    });
});
