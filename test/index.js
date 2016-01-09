var rewire = require("rewire");
var mocha  = require("mocha");
var expect = require("chai").expect;

var StickyServer = require("../lib/index.js");
var StickyMaster = rewire("../lib/master.js");
var StickyWorker = rewire("../lib/worker.js");

var SocketMock = require("./socketMock.js");

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
        master.workers[0].kill(234, "SIGMURDER");
    });
    it("should emit workerRespawned event when worker is killed", function() {
        var master = new StickyMaster(3030, {
            maxWorkers: 0,
            respawn: "always",
            testing: {
                fakeSpawn: true
            }
        });

        master.on("workerRespawned", function(details) {
            // Check that values are correct
            expect(details.worker).to.be.an("object");
            // Check to see that worker is respawned in the same place
            expect(master.workers[1].killed).to.be.false;
        });

        // Kill a Worker
        master.workers[1].kill(234, "SIGMURDER");

        // Make sure it revived
        expect(master.workers[1].killed).to.be.false;
    });
    it("should not emit workerRespawned event for clean exit when config.respawn=\"error\"", function() {
        var master = new StickyMaster(3030, {
            maxWorkers: 0,
            respawn: "error",
            testing: {
                fakeSpawn: true
            }
        });

        master.on("workerRespawned", function(details) {
            throw new Error("Worker respawned even though there was a clean exit");
        });

        // Kill a Worker
        master.workers[1].kill(0, "POLITE");

        // Make sure it died
        expect(master.workers[1].killed).to.be.true;
    });
    it("should never emit workerRespawned event for any exit when config.respawn=\"never\"", function() {
        var master = new StickyMaster(3030, {
            maxWorkers: 0,
            respawn: "never",
            testing: {
                fakeSpawn: true
            }
        });

        master.on("workerRespawned", function(details) {
            throw new Error("Worker respawned even though it shouldn't have");
        });

        // Kill a few Workers
        master.workers[1].kill(0, "POLITE");
        master.workers[2].kill(4, "ROUGH");

        // Make sure they're dead
        expect(master.workers[1].killed).to.be.true;
        expect(master.workers[2].killed).to.be.true;
    });
    it("should generate a proper index for workers", function() {
        var master = new StickyMaster(3030, {
            maxWorkers: 0,
            respawn: "never",
            testing: {
                fakeSpawn: true
            }
        });

        var seedValue = master.indexSeed;

        // Sample ips
        var tests = [
            { in: "128.42.43.12",         out: ((128424312     + seedValue) % numCPUs) },
            { in: "12.12.12.12",          out: ((12121212      + seedValue) % numCPUs) },
            { in: "54.55.0.0",            out: ((545500        + seedValue) % numCPUs) },
            { in: "::1",                  out: ((1             + seedValue) % numCPUs) },
            { in: "ffff::::192.168.1.4",  out: ((19216814      + seedValue) % numCPUs) },
            { in: "2001:cdba::3257:9652", out: ((200132579652  + seedValue) % numCPUs) }
        ];

        for (var i = 0; i < tests.length; i++) {
            var output = master.getIndex(tests[i].in, numCPUs);
            expect(output).to.equal(tests[i].out);
        }
    });
    it("should balance to workers using ip address", function() {
        var master = new StickyMaster(3030, {
            maxWorkers: 0,
            respawn: "always",
            testing: {
                fakeSpawn: true
            }
        });

        var seedValue = master.indexSeed;

        // Sample ips
        var tests = [
            { in: "128.42.43.12",         out: ((128424312     + seedValue) % numCPUs) },
            { in: "12.12.12.12",          out: ((12121212      + seedValue) % numCPUs) },
            { in: "54.55.0.0",            out: ((545500        + seedValue) % numCPUs) },
            { in: "::1",                  out: ((1             + seedValue) % numCPUs) },
            { in: "ffff::::192.168.1.4",  out: ((19216814      + seedValue) % numCPUs) },
            { in: "2001:cdba::3257:9652", out: ((200132579652  + seedValue) % numCPUs) }
        ];

        for (var i = 0; i < tests.length; i++) {
            // Spoof socket
            var socket = new SocketMock(tests[i].in);

            master.balance(socket);

            // Watch designated worker
            master.workers[tests[i].out].on("messageReceived", function(details) {
                // Make sure the right message is sent
                expect(details.message).to.equal("sticky-server:connection");
                // Make sure socket is passed through message
                expect(details.socket.remoteAddress).to.equal(tests[i].in);
            });
        }
    });
    it("should wait for a worker to respawn before crashing on reroute", function() {
        var master = new StickyMaster(3030, {
            maxWorkers: 0,
            respawn: "always",
            testing: {
                fakeSpawn: true
            }
        });

        var seedValue = master.indexSeed;

        // Sample ip
        var test = { in: "128.42.43.12", out: ((128424312 + seedValue) % numCPUs) };

        // Spoof socket
        var socket = new SocketMock(test[i].in);

        // Kill designated worker before balance
        master.workers[test.out].kill(0, "COODE");

        master.balance(socket);

        // Watch for failed route attempt
        master.on("connectionDropped", function(details) {
            // Make sure the right message is sent
            expect(details.worker).to.equal(master.workers[test.out]);
            // Make sure socket is passed through message
            expect(details.socket.remoteAddress).to.equal(test.in);
            // Make sure socket is destroyed
            expect(details.socket.isDestroyed).to.be.true;
        });
    });
});

describe("StickyServer Worker", function() {

});
