var cluster = require("cluster");
var net     = require("net");
var events  = require("events")

// var defaultConfig = {
//     respawn: "always" // never/error/always
// };

function Master(workerFunction, port, config) {
    // Parse provided config
    // this.config = {
    //     respawn: config.respawn.toLowerCase() || defaultConfig.respawn;
    // };

    // Used to cycle through
    this.balanceCounter = 0;

    // Create array for worker instances
    this.workers = [];
    // Inherit from EventEmitter
    events.EventEmitter.call(this);

    // Start listening for inbound connections
    net.Server.call(this, {
        pauseOnConnect: true,
    }, this.balance);
};

Master.prototype.createWorker = function() {
    var worker = cluster.fork();
    var self = this;

    worker.on("exit", function(code, signal) {
        self.emit("workerDied", { worker: worker, code: signal });

        // Respawn worker
        self.respawnWorker(worker);
    });

    // Add to workers list
    return worker;
};

Master.prototype.respawnWorker = function(worker) {
    // Remove worker from workers array
    var index = this.workers.indexOf(worker);

    if (index === -1) {
        this.emit("error", new Error("Tried to respawn a worker that never existed"));
        // Wtf do we do?
        return;
    }

    // Spawn replacement
    this.workers[index] = this.createWorker();
};

Master.prototype.balance = function(socket) {

};

module.exports = Master;
