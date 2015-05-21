$(document).ready(function() {

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

    console.log("touchscreen is", VirtualJoystick.touchScreenAvailable() ? "available" : "not available");
    var canvas = document.getElementById("overlay");
    var context = canvas.getContext('2d');

    var video = document.getElementById('video');
    function resizeCanvas() {
        canvas.width = window.innerWidth*devicePixelRatio;
        canvas.height = window.innerHeight*devicePixelRatio;
    }

    window.addEventListener('resize', resizeCanvas, false);
    var joystick_a    = new VirtualJoystick({
        container   : document.body,
        strokeStyle : 'cyan',
        limitStickTravel: true,
        stickRadius : 120,  
    });
    joystick_a.addEventListener('touchStartValidation', function(event){
        var touch   = event.changedTouches[0];
        return touch.pageX < window.innerWidth/2;
    });
    video.videoWidth = 320;
    video.videoHeight = 240;

    function play() {
        requestAnimationFrame(play);
        context.clearRect (0 , 0 , canvas.width, canvas.height );
        
        if (true || (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0)) {
            
            /* Prepare the detector once the video dimensions are known: */
            if (!detector) {
                var width = ~~(80 * video.videoWidth / video.videoHeight);
                var height = 80;
                detector = new objectdetect.detector(width, height, 1.1, objectdetect.handopen);
            }
        
            /* Draw video overlay: */
            //canvas.width = ~~(100 * video.videoWidth / video.videoHeight);
            //canvas.height = 100;
            //context.drawImage(video, 0, 0, canvas.clientWidth, canvas.clientHeight);
            
            var coords = detector.detect(video, 1);
            if (coords[0]) {
                var coord = coords[0];
                      
                /* Find coordinates with maximum confidence: */
                var coord = coords[0];
                for (var i = coords.length - 1; i >= 0; --i)
                    if (coords[i][4] > coord[4]) coord = coords[i];
                
                /* Rescale coordinates from detector to video coordinate space: */
                coord[0] *= video.videoWidth / detector.canvas.width;
                coord[1] *= video.videoHeight / detector.canvas.height;
                coord[2] *= video.videoWidth / detector.canvas.width;
                coord[3] *= video.videoHeight / detector.canvas.height;

                /* Scroll window: */
/*                var fist_pos = [coord[0] + coord[2] / 2, coord[1] + coord[3] / 2];
                if (fist_pos_old) {
                    var dx = (fist_pos[0] - fist_pos_old[0]) / video.videoWidth,
                            dy = (fist_pos[1] - fist_pos_old[1]) / video.videoHeight;
                    
                        window.scrollBy(dx * 200, dy * 200);
                } else fist_pos_old = fist_pos;
                
                /* Draw coordinates on video overlay: */
                context.beginPath();
                context.lineWidth = '2';
                context.fillStyle = 'rgba(0, 255, 255, 0.5)';
                context.fillRect(
                    coord[0] / video.videoWidth * canvas.clientWidth,
                    coord[1] / video.videoHeight * canvas.clientHeight,
                    coord[2] / video.videoWidth * canvas.clientWidth,
                    coord[3] / video.videoHeight * canvas.clientHeight);
                context.stroke();
            } else fist_pos_old = null;
        }
    }
    //requestAnimationFrame(play);

    // one on the right of the screen
    var joystick_b    = new VirtualJoystick({
        container   : document.body,
        strokeStyle : 'orange',
        limitStickTravel: true,
        stickRadius : 120     
    });
    joystick_b.addEventListener('touchStartValidation', function(event){
        var touch   = event.changedTouches[0];
        return touch.pageX >= window.innerWidth/2;
    });

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
                document.getElementById('video').src = URL.createObjectURL(new Blob([e.data.slice(5)]));
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
            ws.send(JSON.stringify({
                a: {
                    dx: joystick_a.deltaX(),
                    dy: joystick_a.deltaY()
                },
                b: {
                    dx: joystick_b.deltaX(),
                    dy: joystick_b.deltaY()
                }
            }));
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
