var net = require('net');
var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var WsServer = require('ws').Server;
var ws = new WsServer({ port: 3001});
var phenox = require('./node_modules/phenox/build/Release/phenox');
var socket;
phenox.init();
setInterval(function() {
    var send_data = phenox.get_data();
    ws.clients.forEach(function(client) { 
        console.log(data.length);
        //client && client.send(send_data);     
        //console.log(client.bufferedAmount);
        if(client.bufferedAmount == 0) {
        client.send(send_data,{binary: true});
        }
    });
});


ws.on('connection', function(ws) {
    ws.on('message', function(message) {
        console.log(message);
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
