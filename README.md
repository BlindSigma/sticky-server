sticky-server
=============

A small Node library designed to route incoming connections to individual worker processes. Heavily modeled after [sticky-session](https://github.com/indutny/sticky-session) and [node-cluster-socket.io](https://github.com/elad/node-cluster-socket.io), this package aims to provide socket/worker clustering in a server-independent manner.

You must be able to pass a node socket to the server you're trying to use in a cluster.

Also note that, since sticky-server doesn't host an http server of its own, you shouldn't have any issues with HTTP headers in reverse-proxy scenarios.

## Installation ##

    npm install --save sticky-server

## Usage ##

See the example for a full usage example.

Main server.js file:

```javascript
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

```javascript
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

## Testing ##

Tests use [Mocha](https://github.com/mochajs/mocha), [Chai](https://github.com/chaijs/chai), and [Rewire](https://github.com/jhnns/rewire)

Feel free to add more tests, coverage could certainly be improved. Tests are required for new PRs to be accepted.

Since this package behaves differently depending on the number of cores available to your machine, tests may fail on single-core machines.

    npm test

    ...

    15 passing (6s)
