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
    if (this.config.testing && this.config.testing.fakeSpawn) {
        var WorkerMock = require("../test/workerMock.js");
        var worker = new WorkerMock();
    }else{
        var worker = cluster.fork();
    }

    // Watch for death
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

    // Watch for messages
    worker.on("message", function(message) {
        this.emit("workerMessage", { worker: worker, message: message });
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
Master.prototype.balance = function(socket, retries) {
    // Make sure retries value is set
    if (retries === undefined) {
        retries = (this.config.maxBalanceAttempts || 3);
    }

    // Route socket to worker
    var route = function route(worker, socket) {
        // Send message to worker function containing socket
        worker.send("sticky-server:connection", socket);

        this.emit("connectionRouted", { worker: worker, socket: socket });
    }.bind(this);

    var index = this.getIndex(socket.remoteAddress, this.workers.length);
    var worker = this.workers[index];

    // Check to see if worker is dead
    if (!worker.isConnected()) {
        // Check config, attempt to reroute
        if (this.config.rerouteWorkers) {
            for (var i = 0; i < this.workers.length; i++) {
                // Skip dead workers
                if (!this.workers[i].isConnected()) continue;
                // Attempt to route to new connection
                route(this.workers[i], socket);
                return;
            }
            // No workers alive
            //throw new Error("Couldn't route connection; all workers are dead/disconnected");
            socket.destroy();
            this.emit("connectionDropped", { reason: "No available replacement worker", worker: worker, socket: socket });
            return;
        }else{
            // Wait for worker to be available
            if (retries <= 0) {
                //throw new Error("Worker didn't respawn in time for connection to be routed");
                socket.destroy();
                this.emit("connectionDropped", { reason: "Worker didn't respawn in time to reconnect", worker: worker, socket: socket });
                return;
            }
            // Wait for worker to return and make a new attempt
            setTimeout(function() { this.balance(socket, --retries) }.bind(this), this.config.balanceWaitTime);
        }

        // Don't route normally
        return;
    }

    // Default route
    route(worker, socket)
};

// Send message to all workers
Master.prototype.broadcast = function(payload) {
    var message = { type: "sticky-server:broadcast", payload: payload };
    for (var i = 0; i < this.workers.length; i++) {
        if (!this.workers[i].isConnected()) continue;

        this.workers[i].send(message);
    }
};

// Send message to specific worker id
Master.prototype.send = function(payload, workerId) {
    var message = { type: "sticky-server:broadcast", payload: payload, to: workerId };
    for (var i = 0; i < this.workers.length; i++) {
        if (this.workers[i].id === workerId) {
            if (!this.workers[i].isConnected()) return;

            this.workers[i].send(message);
            return;
        }
    }
};

module.exports = Master;
