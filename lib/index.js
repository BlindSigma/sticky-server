// sticky-server main

var cluster = require("cluster");
var events  = require("events");

var Master  = require("./master.js");
var Worker  = require("./worker.js");

// Options should be documented
var defaultConfig = {
    respawnWorkers: "always", // never/error/always
    maxWorkers: 0 // Max-available cores
};

var StickyServer = function(config) {
    if (!config) config = {};
    // Parse provided config
    this.config = {
        respawnWorkers: (config.respawnWorkers || defaultConfig.respawnWorkers).toLowerCase(),
        maxWorkers: config.maxWorkers || defaultConfig.maxWorkers
    };
};

// Start server/fork workers
StickyServer.prototype.listen = function(port) {
    // Launch master cluster
    if (cluster.isMaster) {
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
