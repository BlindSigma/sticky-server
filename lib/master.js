// Master object

var cluster = require("cluster");
var net     = require("net");
var events  = require("events")

var Master = function(port, config) {
    // Use provided config
    this.config = config;

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

    // Start listening server to route connections
    this.server = net.createServer({ pauseOnConnect: true }, function(socket) {
        this.balance(socket);
    }).listen(port);
};

Master.prototype.createWorker = function() {
    var worker = cluster.fork();
    var self = this;

    worker.on("exit", function(code, signal) {
        self.emit("workerDied", { worker: worker, code: signal });

        // Respawn worker if allowed by configuration
        if ((config.respawn == "always") ||
            (config.respawn == "error" && signal !== 0)) {
            this.respawnWorker(worker);
        }else{
            // Removing a worker will displace existing connections
            // What should be done in this scenario?
        }
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

// Generate a worker index for an ip
// See https://github.com/elad/node-cluster-socket.io
Master.prototype.getIndex = function(ip, len) {
    var s = "";
    for (var i = 0, _len = ip.length; i < _len; i++) {
        if (ip[i] !== ".") {
            s += ip[i];
        }
    }

    return Number(s) % len;
};

// Distribute connections to workers
Master.prototype.balance = function(socket) {
    var index = this.getIndex(socket.remoteAddress, this.workers.length);
    var worker = this.workers[index];

    worker.send("sticky-server:connection", socket);
};

module.exports = Master;
