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
    ws.clients.forEach(function(client) { 
        if(client.bufferedAmount == 0) {
            client.send(send_data,{binary: true});
            client.send(JSON.stringify(phenox_data.features),{binary: true});
        }
    });
}, 25);

ws.on('request', function(request) {
    var connection = request.accept(null, request.origin); 
    connection.binaryType = "arraybuffer";
    console.log(1);
});
ws.on('connection', function(ws) {
    ws.on('message', function(message) {
        var obj=JSON.parse( message);
        if (message.type && message.type == "command") {
            if (message.cmd == "up") {
                phenox.go_up();
            } else if (message.cmd == "down") {
                phenox.go_down();
            }
        } else {
            phenox.set_angles(obj.a.dx, obj.a.dy, obj.b.dx);//obj.b.dx
            if (obj.b.dy != 0) {

            }
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
