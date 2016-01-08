var cluster = require("cluster");

var StickyServer = require("../lib/index.js"); // require("sticky-server");

// Custom worker
var ServerWorker = require("./worker.js");


var port = 3000;

// Create a new sticky server instance
var sticky = new StickyServer();


// Determine if this is a worker
if (cluster.isMaster) {
    // Start master server and listen on port 3000
    master = sticky.listen(port);

    console.log("Master server listening on port ", port);

    master.on("workerRespawned", function(event) {
        console.log("Respawned worker:", event.worker);
    });

    master.on("workerDied", function(event) {
        console.log("Worker died:", event.worker.id, "with code", event.code);
        // Send a message to all workers
        master.broadcast("Worker " + event.worker.id + " died");
    });

    master.on("connectionRouted", function(event) {
        var worker = event.worker;
        var socket = event.socket;

        // Send a message to that specific worker
        master.send("Sent a connection your way", worker.id);
    });

    master.on("workerMessage", function(event) {
        var worker = event.worker;
        var message = event.message;

        console.log("Received message from worker " + worker.id + ": " + message);
    });

    // Other master code here

}else{
    // Create new worker object
    var worker = new ServerWorker();

    // Provide sticky with function to call with new sockets
    sticky.work(worker);

    console.log("Started worker", cluster.worker.id);

    // Other worker code here
}
