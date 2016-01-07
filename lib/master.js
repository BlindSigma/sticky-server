// Master object

var cluster = require("cluster");
var net     = require("net");
var events  = require("events")

var Master = function Master(port, config) {
    // Use provided config
    this.config = config;

    // Create array for worker instances
    this.workers = [];

    // Launch workers
    var numCPUs = require("os").cpus().length;
    for (var i = 0; i < numCPUs; i++) {
        // Respect maxWorkers value
        if (this.config.maxWorkers && i == this.config.maxWorkers) break;

        var worker = this.createWorker();

        this.workers.push(worker);

        this.emit("workerCreated", { worker: worker });
    }

    // Randomize worker for each launch
    this.indexSeed = Math.floor(Math.random() * numCPUs);

    var self = this;

    // Start listening server to route connections
    this.server = net.createServer({ pauseOnConnect: true }, function(socket) {
        self.balance(socket);
    }).listen(port);
};

// Inherit from EventEmitter
Master.prototype.__proto__ = events.EventEmitter.prototype;

Master.prototype.createWorker = function() {
    if (this.config.testing.fakeSpawn) {
        var WorkerMock = require("../test/workerMock.js");
        var worker = new WorkerMock();
    }else{
        var worker = cluster.fork();
    }

    worker.on("exit", function(code, signal) {
        this.emit("workerDied", { worker: worker, code: code, signal: signal });

        // Respawn worker if allowed by configuration
        if ((this.config.respawn == "always") ||
            (this.config.respawn == "error" && code !== 0)) {
            this.respawnWorker(worker);
        }else{
            // Removing a worker will displace existing connections
            // What should be done in this scenario?
        }
    }.bind(this));

    // Add to workers list
    return worker;
};

Master.prototype.respawnWorker = function(worker) {
    // Replace worker
    var index = this.workers.indexOf(worker);

    if (index === -1) {
        this.emit("error", new Error("Tried to respawn a worker that never existed."));
        // What else do we do?
        return;
    }

    // Spawn replacement
    this.workers[index] = this.createWorker();

    this.emit("workerRespawned", { worker: this.workers[index] });
};

// Generate a worker index for an ip (simple ip hashing)
// See https://github.com/elad/node-cluster-socket.io
Master.prototype.getIndex = function(ip, len) {
    var s = "";
    for (var i = 0, _len = ip.length; i < _len; i++) {
        // Ignore non-numeric characters
        if (!isNaN(parseFloat(ip[i]))) {
            s += ip[i];
        }
    }

    return (Number(s) + this.indexSeed) % len;
};

// Distribute connections to workers
Master.prototype.balance = function(socket) {
    var index = this.getIndex(socket.remoteAddress, this.workers.length);
    var worker = this.workers[index];

    // Send message to worker function containing socket
    worker.send("sticky-server:connection", socket);

    this.emit("connectionRouted", { worker: worker, socket: socket });
};

module.exports = Master;
