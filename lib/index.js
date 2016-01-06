// sticky-server main

var cluster = require("cluster");
var events = require("events");

var Master = require("./master.js");
var Worker = require("./worker.js");

// Options should be documented
var defaultConfig = {
    respawnWorkers: "always", // never/error/always
    maxWorkers: 0 // Max-available cores
};

var StickyServer = function(workerFunction, config) {
    // Parse provided config
    this.config = {
        respawnWorkers: config.respawnWorkers.toLowerCase() || defaultConfig.respawnWorkers,
        maxWorkers: config.maxWorkers || defaultConfig.maxWorkers
    };
    // Function to call with a socket
    this.workerFunction = workerFunction;
};

// Start server/fork workers
StickyServer.prototype.listen = function(port) {
    // Launch master cluster
    if (cluster.isMaster) {
        // Create new master object
        var master = new Master(port, this.config);

        // Make sure EventEmitter is returned
        return master;
    }else{
        // Create a new worker object
        var worker = new Worker(this.workerFunction);

        // Return dummy EventEmitter, this may be useful at some point
        return new events.EventEmitter();
    }
};

module.exports = StickyServer;
