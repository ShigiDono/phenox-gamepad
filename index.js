var net = require('net');
var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var WsServer = require('ws').Server;
var ws = new WsServer({ port: 3001});
var phenox = require('./phenox/build/Release/phenox');
var fs = require('fs');
var socket;
phenox.init();
function toBuffer(ab) {
    var buffer = new Buffer(ab.length + 5);
    var view = ab;
    buffer[4] = 0;
    var a = new Uint32Array(buffer);
    a[0] = ab.length;  
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i+5] = view.array[i];
    }
    return buffer;
}
setInterval(function() {
    var phenox_data = phenox.get_data();
    var send_data = toBuffer(phenox_data);
    if (ws && ws.clients) {
        ws.clients.forEach(function(client) { 
            if(client.bufferedAmount == 0) {
                client.send(send_data,{binary: true});
                client.send(JSON.stringify(phenox_data.features),{binary: true});
            }
        });
    }
}, 25);

ws.on('request', function(request) {
    var connection = request.accept(null, request.origin); 
    connection.binaryType = "arraybuffer";
    console.log(1);
});
ws.on('connection', function(ws) {
    ws.on('message', function(message) {
        var obj=JSON.parse( message);
        console.log(message);
        if (obj.type == "command") {
            if (obj.cmd == "up") {
                phenox.go_up();
            } else if (obj.cmd == "down") {
                phenox.go_down();
            }
        } else {
            if (Math.abs(obj.a.dx) > 1 || Math.abs(obj.a.dy) > 1/* || obj.b.dx != 0*/) {
                //phenox.set_angle(-obj.a.dy/15, -obj.a.dx/15/*, obj.b.dx/15*/);//obj.b.dx
                phenox.set_pos(obj.a.dx, 0/*, obj.b.dx/15*/);//obj.b.dx
            }
            /*if (obj.b.dy < -100) {
                phenox.go_up();

            } else if (obj.b.dy > 100) {
                phenox.go_down();
            }*/
        }
    });
}); 

app.get('/', function (req, res) {
    fs.readFile(__dirname + '/index.html', function(err, content) {
        if (err) { throw err; }
        console.log("response end");
        res.end(content);
    });
});


app.use(express.static(__dirname + '/public'));

app.listen(port, function () {
  console.log('Listening on port ', port)
})
