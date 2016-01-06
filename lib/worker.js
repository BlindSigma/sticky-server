// Worker object

var Worker = function(workerFunction){
    // Watch for messages from master
    process.on("message", function(message, socket) {
        // Don't parse messages that aren't ours
        if (message !== "sticky-server:connection") return;
        // Pass socket to user's worker code
        workerFunction(socket);
    });
};

module.exports = Worker;
