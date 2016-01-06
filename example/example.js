var StickyServer = require("lib/");

// Custom worker
var ServerWorker = require("./worker.js");



// Config is optional
// Limit to 2 workers, set to 0 for max processors
var config = {
    maxWorkers: 2
};

// Start server and listen on 3000
var sticky = new StickyServer(worker, config).listen(3000);
