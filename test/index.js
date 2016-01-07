var rewire = require("rewire");
var mocha  = require("mocha");
var expect = require("chai").expect;

var StickyServer = require("../lib/index.js");
var StickyMaster = rewire("../lib/master.js");
var StickyWorker = rewire("../lib/worker.js");

describe("StickyServer", function() {
    var sticky;

    beforeEach(function() {

    });
    it("should allow missing config object", function() {
        sticky = new StickyServer();

        expect(sticky).to.have.property("config");
    });
    it("should apply default config values when object is undefined", function() {
        sticky = new StickyServer();

        expect(sticky.config).to.have.property("respawnWorkers").and.equal("always");
        expect(sticky.config).to.have.property("maxWorkers").and.equal(0);
    });
    it("should apply only provided config values", function() {
        sticky = new StickyServer({ maxWorkers: 4 });

        expect(sticky.config).to.have.property("respawnWorkers").and.equal("always");
        expect(sticky.config).to.have.property("maxWorkers").and.equal(4);
    });
    it("should apply lowercase config string values", function() {
        sticky = new StickyServer({ respawnWorkers: "ERROR" });

        expect(sticky.config).to.have.property("respawnWorkers").and.equal("error");
    });
    it("should not accept missing port", function() {
        sticky = new StickyServer();

        expect(function() { sticky.listen() }).to.throw();
    });
});

describe("StickyServer Master", function() {
    var numCPUs;

    beforeEach(function() {
        StickyMaster = rewire("../lib/master.js");
        numCPUs = require("os").cpus().length;
    })
    it("should cap number of workers to cpu number", function() {
        // This test is machine-dependent

        var master = new StickyMaster(3030, {
            maxWorkers: numCPUs+2,
            respawn: "always",
            testing: {
                fakeSpawn: true
            }
        });

        expect(master.workers.length).to.equal(numCPUs);
    });
    it("should cap number of workers to config value", function() {
        // This test is machine-dependent

        // Don't run test if there is only one core
        if (numCPUs === 1) return done();

        var master = new StickyMaster(3030, {
            maxWorkers: numCPUs-1,
            respawn: "always",
            testing: {
                fakeSpawn: true
            }
        });

        expect(master.workers.length).to.equal(numCPUs-1);
    });
    it("should emit workerDied event when worker is killed", function() {
        var master = new StickyMaster(3030, {
            maxWorkers: 0,
            respawn: "never",
            testing: {
                fakeSpawn: true
            }
        });

        master.on("workerDied", function(details) {
            // Check that values are correct
            expect(details.worker).to.be.an("object");
            expect(details.code).to.equal(234);
            expect(details.signal).to.equal("SIGMURDER");
        });

        // Kill a Worker
        master.workers[0].kill(234, "SIGMURDER")
    });
});

describe("StickyServer Worker", function() {

});
