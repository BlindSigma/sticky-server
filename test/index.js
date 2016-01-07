var rewire = require("rewire");
var mocha  = require("mocha");
var expect = require("chai").expect;

var StickyServer = rewire("../lib/");

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
});

describe("StickyServer Master", function() {

});

describe("StickyServer Worker", function() {

});
