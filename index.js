var net = require('net');
var fs = require('fs');
var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var fs = require('fs');
var WsServer = require('ws').Server;
var ws = new WsServer({ port: 3001});

var unixsock_server = net.createServer(function (c) {    
    c.on("data", function(data) {

    var send_data = data;
    ws.clients.forEach(function(client) { 
        console.log(data.length);
        //client && client.send(send_data);     
        //console.log(client.bufferedAmount);
        if(client.bufferedAmount == 0) {
        client.send(send_data,{binary: true});
        }
    });
    //!compressed in client
    
    });
    c.on('error', function() {
        console.log('client error');
    });
    ws.on('message', function(message) {
        //

        c.write(message);
    });

});

function broadcast() {
    fs.unlink('./mysocket', function (err) {
        unixsock_server.listen('/root/javascript/projects/mysocket');
    });
}

//broadcast();     

ws.on('connection', function(ws) {
    console.log('New connection');
}); 

app.get('/', function (req, res) {
    fs.readFile('index.html', function(err, content) {
        if (err) { throw err; }
        console.log("response end");
        res.end(content);
    });
});


app.use(express.static(__dirname + '/public'));

app.listen(port, function () {
  console.log('Listening on port ', port)
})