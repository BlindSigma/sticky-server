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
    // Parse provided config
    this.config = {
        respawnWorkers: config.respawnWorkers.toLowerCase() || defaultConfig.respawnWorkers,
        maxWorkers: config.maxWorkers || defaultConfig.maxWorkers
    };
};

// Start server/fork workers
StickyServer.prototype.listen = function(port) {
    // Launch master cluster
    if (cluster.isMaster) {
        // Create new master object
        var master = new Master(port, this.config);

        // Make sure EventEmitter is returned
        return master;
    }
};

StickyServer.prototype.work = function(workerFunction) {
    // Launch master cluster
    if (cluster.isWorker) {
        // Function to call with a socket
        this.workerFunction = workerFunction || function() {};
        // Create a new worker object
        var worker = new Worker(this.workerFunction);
    }
};

module.exports = StickyServer;
module.exports.isMaster = function() { return cluster.isMaster };
module.exports.isWorker = function() { return cluster.isWorker };
