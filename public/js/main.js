$(document).ready(function() {
    console.log("touchscreen is", VirtualJoystick.touchScreenAvailable() ? "available" : "not available");
    var canvas = document.getElementById("overlay");
    var overlayContext = canvas.getContext('2d');

    var videoInput = document.getElementById('video');
    var canvasInput = document.getElementById('overlay');

    var htracker = new headtrackr.Tracker({calcAngles : true, ui : false, headPosition : false, debug : debugOverlay}});
    htracker.init(videoInput, canvasInput, false);
    htracker.start();
    document.addEventListener("facetrackingEvent", function( event ) {
        // clear canvas
        overlayContext.clearRect(0,0,320,240);
        // once we have stable tracking, draw rectangle
        if (event.detection == "CS") {
            overlayContext.translate(event.x, event.y)
            overlayContext.rotate(event.angle-(Math.PI/2));
            overlayContext.strokeStyle = "#00CC00";
            overlayContext.strokeRect((-(event.width/2)) >> 0, (-(event.height/2)) >> 0, event.width, event.height);
            overlayContext.rotate((Math.PI/2)-event.angle);
            overlayContext.translate(-event.x, -event.y);
        }
    });
    
    // turn off or on the canvas showing probability
    function showProbabilityCanvas() {
        var debugCanvas = document.getElementById('debug');
        if (debugCanvas.style.display == 'none') {
            debugCanvas.style.display = 'block';
        } else {
            debugCanvas.style.display = 'none';
        }
    }

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
            if (joystick_b.deltaY() > 119) {
                go_up = go_up || setTimeout(function() {
                    ws.send(JSON.stringify({
                        type: "command",
                        cmd: "down"
                    }))
                }, 2000);
            } else {
                clearTimeout(go_up);
                go_up = null;
            }
            if (joystick_b.deltaY() < -119) {
                go_down = go_down || setTimeout(function() {
                    ws.send(JSON.stringify({
                        type: "command",
                        cmd: "up"
                    }))
                }, 2000);
            } else {
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
