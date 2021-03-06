// This example worker module will be created for each new cluster worker

// Any server will work so long as you can pass a socket to it
var http    = require("http");

// Cluster is not necessary unless you want the worker id
var cluster = require("cluster");

var ServerWorker = function ServerWorker() {
    // Create server instance
    var server = http.createServer(function(req, res) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Connected to worker " + cluster.worker.id);
    });

    // Start listening to a random port
    // Don't listen on the same port as the master server
    this.server = server.listen(0);

    // Other server worker code here

};

// This will be called when a client is assigned to this worker
ServerWorker.prototype.addConnection = function(socket) {
    console.log("Connection routed to worker " + cluster.worker.id);

    // Trigger a connection event to the worker server, pass in provided socket
    this.server.emit("connection", socket);

    // Resume connection (necessary, sticky-server uses pauseOnConnect)
    socket.resume();
};

// Catch messages if they are sent to this worker
// This is an optional method, if you exclude it then it won't be called
ServerWorker.prototype.clusterMessage = function(message) {
    console.log("Message received by worker " + cluster.worker.id + ": " + message);

    if (message === "Sent a connection your way") {
        // Reply
        process.send("Thanks!");
    }
};

module.exports = ServerWorker;
