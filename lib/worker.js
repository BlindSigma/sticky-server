// Worker object

var Worker = function Worker(workerObject) {
    // Watch for messages from master
    process.on("message", function(message, socket) {
        // Don't parse messages that aren't ours
        if (message !== "sticky-server:connection") return;
        // Pass socket to user's worker code
        workerObject.addConnection(socket);
    });
};

module.exports = Worker;
