var StickyServer = require("../lib/index.js");

// Custom worker
var ServerWorker = require("./worker.js");



// Config is optional
// Limit to 2 workers, set to 0 for max processors
var config = {
    maxWorkers: 2
};

// Create a new sticky server
var sticky = new StickyServer(config);

// Determine if this is a worker
if (StickyServer.isMaster) {
    // Start master server and listen on port 3000
    sticky.listen(3000);

    // Master code

}else{
    // Create new worker object
    var worker = new ServerWorker();

    // Provide sticky with function to call with new sockets
    sticky.work(worker.addConnection);

    // Other worker code
    
}
