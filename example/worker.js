// This worker module will be created for each new cluster worker

// Any server will work so long as you can pass a socket to it
var http    = require("http");

// Cluster is not necessary unless you want the worker id
var cluster = require("cluster");

var ServerWorker = function() {
    // Create server instance
    this.server = http.createServer(function(req, res) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Connected to worker " + cluster.worker.id);
    });

    // Start listening to a random port
    this.server.listen(0);
};

// Function to pass to sticky-server
// This will be called when a client is assigned to this worker
ServerWorker.prototype.addConnection = function(socket) {
    console.log("Connection routed to worker " + cluster.worker.id);

    // Fake a connnection event to the worker server, pass in provided socket
    this.server.emit("connected", socket);

    // Resume connection (necessary, sticky-server uses pauseOnConnect)
    socket.resume();
};

module.exports = ServerWorker;
