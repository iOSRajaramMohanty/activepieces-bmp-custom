// Browser-compatible polyfill for Node.js stream module
// Used by form-data/delayed-stream and other dependencies

// Minimal EventEmitter implementation for streams
function EventEmitter() {
  this._events = {};
}

EventEmitter.prototype.on = function(event, listener) {
  if (!this._events[event]) {
    this._events[event] = [];
  }
  this._events[event].push(listener);
  return this;
};

EventEmitter.prototype.emit = function(event) {
  if (!this._events[event]) {
    return false;
  }
  var args = Array.prototype.slice.call(arguments, 1);
  this._events[event].forEach(function(listener) {
    listener.apply(this, args);
  }.bind(this));
  return true;
};

EventEmitter.prototype.removeListener = function(event, listener) {
  if (!this._events[event]) {
    return this;
  }
  var index = this._events[event].indexOf(listener);
  if (index !== -1) {
    this._events[event].splice(index, 1);
  }
  return this;
};

// Stream base class
function Stream() {
  EventEmitter.call(this);
}

// Manual inheritance (don't use require() here as it gets replaced by webpack)
Stream.prototype = Object.create(EventEmitter.prototype);
Stream.prototype.constructor = Stream;

Stream.prototype.pipe = function(dest) {
  this.on('data', function(chunk) {
    dest.write(chunk);
  });
  this.on('end', function() {
    dest.end();
  });
  return dest;
};

Stream.prototype.read = function() {
  return null;
};

Stream.prototype.write = function(chunk) {
  this.emit('data', chunk);
  return true;
};

Stream.prototype.end = function(chunk) {
  if (chunk) {
    this.write(chunk);
  }
  this.emit('end');
  return this;
};

Stream.prototype.pause = function() {
  return this;
};

Stream.prototype.resume = function() {
  return this;
};

// Readable stream
function Readable() {
  Stream.call(this);
}
Readable.prototype = Object.create(Stream.prototype);
Readable.prototype.constructor = Readable;

// Writable stream
function Writable() {
  Stream.call(this);
}
Writable.prototype = Object.create(Stream.prototype);
Writable.prototype.constructor = Writable;

// Duplex stream
function Duplex() {
  Stream.call(this);
}
Duplex.prototype = Object.create(Stream.prototype);
Duplex.prototype.constructor = Duplex;

// Transform stream
function Transform() {
  Duplex.call(this);
}
Transform.prototype = Object.create(Duplex.prototype);
Transform.prototype.constructor = Transform;

// Export as CommonJS module
module.exports = {
  Stream: Stream,
  Readable: Readable,
  Writable: Writable,
  Duplex: Duplex,
  Transform: Transform,
  PassThrough: Transform, // PassThrough is often used as Transform
  EventEmitter: EventEmitter
};
