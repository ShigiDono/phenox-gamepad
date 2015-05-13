$(document).ready(function() {
    console.log("touchscreen is", VirtualJoystick.touchScreenAvailable() ? "available" : "not available");
    var overlay = document.getElementById("overlay"),
    ctx     = overlay.getContext('2d');
    ctx.fillRect(0, 0, overlay.width, overlay.height);
    // 
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
    ws.onopen = function(){    
        ws.onmessage = function(e) {
            document.getElementById('video').src = URL.createObjectURL(new Blob([e.data.slice(5)]));
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
                dx: joystick_b.deltaY(),
                dy: joystick_b.deltaY()
            }
        }));
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