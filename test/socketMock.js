var events = require("events");

var SocketMock = function SocketMock(addr) {
    this.isDestroyed = false;
    this.remoteAddress = (addr || "0.0.0.0");
};

// Inherit from EventEmitter
SocketMock.prototype.__proto__ = events.EventEmitter.prototype;

SocketMock.prototype.destroy = function() {
    this.isDestroyed = true;
    this.emit("destroy");
};

module.exports = SocketMock;
