var events = require("events");

var WorkerMock = function WorkerMock() {
    this.killed = false;
};

// Inherit from EventEmitter
WorkerMock.prototype.__proto__ = events.EventEmitter.prototype;

WorkerMock.prototype.kill = function(code, signal) {
    // Flip flag and pretend to die
    this.killed = true;
    this.emit("exit", code, signal);
};

WorkerMock.prototype.send = function(message, data) {
    // Reemit message and data
    this.emit("messageReceived", { message: message, socket: data });
};

WorkerMock.prototype.isConnected = function() {
    return !this.killed;
};

module.exports = WorkerMock;
