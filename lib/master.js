var cluster = require("cluster");
var net     = require("net");
var events  = require("events")

var defaultConfig = {
    respawn: "always" // never/error/always
};

function Master(workerFunction, port, config) {
    // Parse provided config
    this.config = {
        respawn: config.respawn.toLowerCase() || defaultConfig.respawn;
    };

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
        self.ee.emit("workerDied", { worker: worker, code: signal });

        // Respawn worker if allowed by configuration
        if ((config.respawn == "always") ||
            (config.respawn == "error" && signal !== 0)) {
            this.respawnWorker(worker);
        }
    });

    // Add to workers list
    this.workers.push(worker);
};

Master.prototype.respawnWorker = function(worker) {
    // Remove worker from workers array
    var index = this.workers.indexOf(worker);
    if (index === -1) this.workers.splice(worker, 1);

    // Spawn replacement
    this.createWorker();
};

Master.prototype.

module.exports = Master;
