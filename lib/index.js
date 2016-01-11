// sticky-server main

var cluster = require("cluster");
var events  = require("events");

var Master  = require("./master.js");
var Worker  = require("./worker.js");

// Options should be documented
var defaultConfig = {
    respawnWorkers: "always", // never/error/always
    rerouteWorkers: false, // Place connections with next available process on balance failure
    maxWorkers: 0, // Max-available workers (0 = number of cores)
    maxBalanceAttempts: 3, // Connection reroute attempts
    balanceWaitTime: 3000 // Time to wait between reroute attempts
};

var StickyServer = function(config) {
    if (!config) config = {};
    // Parse provided config
    this.config = {
        respawnWorkers: (config.respawnWorkers || defaultConfig.respawnWorkers).toLowerCase(),
        maxWorkers: config.maxWorkers || defaultConfig.maxWorkers,
        maxBalanceAttempts: config.maxBalanceAttempts || defaultConfig.maxBalanceAttempts,
        balanceWaitTime: config.balanceWaitTime || defaultConfig.balanceWaitTime
    };
};

// Start server/fork workers
StickyServer.prototype.listen = function(port) {
    if (!port) throw new Error("You must specify a listening port");

    // Launch master cluster
    if (cluster.isMaster && port) {
        // Create new master object
        this.master = new Master(port, this.config);

        // Make sure EventEmitter is returned
        return this.master;
    }
};

StickyServer.prototype.work = function(workerObject) {
    // Launch master cluster
    if (cluster.isWorker) {
        // Create a new worker object
        this.worker = new Worker(workerObject);
    }
};

module.exports = StickyServer;
