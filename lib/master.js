var cluster = require("cluster");
var net     = require("net");
var events  = require("events")

var defaultConfig = {
    respawnWorkers: "always", // never/error/always
    maxWorkers: 0 // Max-available cores
};

function Master(workerFunction, port, config) {
    // Parse provided config
    this.config = {
        respawnWorkers: config.respawnWorkers.toLowerCase() || defaultConfig.respawnWorkers,
        maxWorkers: config.maxWorkers || defaultConfig.maxWorkers
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

    // Start listening server to route connetions
    this.server = net.createServer({ pauseOnConnect: true }, function(socket) {
        this.balance(socket);
    }).listen(port);
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

// Generate a worker index for an ip
Master.prototype.getIndex = function(ip, len) {
    var s = '';
    for (var i = 0, _len = ip.length; i < _len; i++) {
        if (ip[i] !== '.') {
            s += ip[i];
        }
    }

    return Number(s) % len;
};

Master.prototype.balance = function(socket) {
    var index = this.getIndex(socket.remoteAddress, this.workers.length);
    var worker = this.workers[index];

    worker.send("sticky-server:connection", socket);
};

module.exports = Master;
