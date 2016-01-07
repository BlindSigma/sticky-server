sticky-server
=============

A small Node library designed to route incoming connections to individual worker processes. Heavily modeled after [sticky-session](https://github.com/indutny/sticky-session) and [node-cluster-socket.io](https://github.com/elad/node-cluster-socket.io), this package aims to provide socket/worker clustering in a server-independent manner.

So long as the server you're trying to implement can read from a socket, this library should work.

## Installation ##

    npm install --save sticky-server

## Usage ##

See /example/ for full code

Main server.js file:

```node
var cluster = require("cluster");
var StickyServer = require("sticky-server");

var ServerWorker = require("worker.js");


var port = 3000;

// Create a new sticky server instance
var sticky = new StickyServer();

if (cluster.isMaster) {
    // Start master server and listen on port 3000
    sticky.listen(port);

    console.log("Master server listening on port ", port);

}else{
    var worker = new ServerWorker();

    sticky.work(worker);

    console.log("Started worker", cluster.worker.id);
}
```


worker.js:

```node
// Any server will work so long as you can pass a socket to it
var http    = require("http");

// Cluster is not necessary unless you want the worker id
var cluster = require("cluster");

var ServerWorker = function ServerWorker() {
    var server = http.createServer(function(req, res) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Connected to worker " + cluster.worker.id);
    });

    this.server = server.listen(0);
};

// This will be called by sticky-server when a client is assigned to this worker
ServerWorker.prototype.addConnection = function(socket) {
    console.log("Connection routed to worker " + cluster.worker.id);

    // Trigger a connection event to the worker server, pass in provided socket
    this.server.emit("connection", socket);

    // Resume connection (necessary, sticky-server uses pauseOnConnect)
    socket.resume();
};

module.exports = ServerWorker;
```
