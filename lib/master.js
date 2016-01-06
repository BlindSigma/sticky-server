var cluster = require("cluster");
var net     = require("net");
var events  = require("events")

var defaultConfig = {
    maxWorkers: 0 // Max-available cores
};

function Master(workerFunction, port, config) {
    // Parse provided config
    this.config = {
        maxWorkers: config.maxWorkers || defaultConfig.maxWorkers;
    };

    // Used to cycle through
    this.balanceCounter = 0;

    // Create array for worker instances
    this.workers = [];
    // Inherit from EventEmitter
    events.EventEmitter.call(this);

    // Launch workers
    var numCPUs = require("os").cpus().length;
    for (var i = 0; i < numCPUs; i++) {
        // Respect maxWorkers value
        if (this.config.maxWorkers && i == this.config.maxWorkers) break;
        this.workers.push(this.createWorker());
    }

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
        this.emit("error", new Error("Tried to respawn a worker that never existed. Did every worker die?"));
        // Wtf else do we do?
        return;
    }

    // Spawn replacement
    this.workers[index] = this.createWorker();
};

Master.prototype.balance = function(socket) {

};

module.exports = Master;
