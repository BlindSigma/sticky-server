// Worker object

var cluster = require("cluster");

var Worker = function Worker(workerObject) {
    // Watch for messages from master
    process.on("message", function(message, socket) {
        if (message === "sticky-server:connection") {
            // Pass socket to user's worker code
            workerObject.addConnection(socket);
        } else if (message.type && message.type === "sticky-server:broadcast") {
            // Ignore messages that aren't for this worker
            if (message.to && message.to !== cluster.worker.id) return;

            // Call worker function if it existse
            if (typeof workerObject.clusterMessage == "function") {
                workerObject.clusterMessage(message.payload);
            }
        }
    });
};

module.exports = Worker;
