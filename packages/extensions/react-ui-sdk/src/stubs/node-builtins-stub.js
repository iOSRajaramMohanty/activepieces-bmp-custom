// Browser stub for Node.js built-in modules (http, https, net, dns, tls, etc.)
// Provides extendable constructors so `class Foo extends require('http').Server` works.

function EventEmitter() {
  this._events = {};
}
EventEmitter.prototype.on = function() { return this; };
EventEmitter.prototype.once = function() { return this; };
EventEmitter.prototype.off = function() { return this; };
EventEmitter.prototype.emit = function() { return false; };
EventEmitter.prototype.removeListener = function() { return this; };
EventEmitter.prototype.addListener = function() { return this; };
EventEmitter.prototype.removeAllListeners = function() { return this; };
EventEmitter.prototype.listeners = function() { return []; };
EventEmitter.prototype.listenerCount = function() { return 0; };
EventEmitter.prototype.setMaxListeners = function() { return this; };

function BaseServer() { EventEmitter.call(this); }
BaseServer.prototype = Object.create(EventEmitter.prototype);
BaseServer.prototype.constructor = BaseServer;
BaseServer.prototype.listen = function() { return this; };
BaseServer.prototype.close = function(cb) { if (cb) cb(); return this; };
BaseServer.prototype.address = function() { return null; };

function BaseAgent() { EventEmitter.call(this); }
BaseAgent.prototype = Object.create(EventEmitter.prototype);
BaseAgent.prototype.constructor = BaseAgent;
BaseAgent.prototype.destroy = function() {};

function IncomingMessage() { EventEmitter.call(this); }
IncomingMessage.prototype = Object.create(EventEmitter.prototype);
IncomingMessage.prototype.constructor = IncomingMessage;

function ServerResponse() { EventEmitter.call(this); }
ServerResponse.prototype = Object.create(EventEmitter.prototype);
ServerResponse.prototype.constructor = ServerResponse;

function Socket() { EventEmitter.call(this); }
Socket.prototype = Object.create(EventEmitter.prototype);
Socket.prototype.constructor = Socket;
Socket.prototype.connect = function() { return this; };
Socket.prototype.write = function() { return true; };
Socket.prototype.end = function() { return this; };
Socket.prototype.destroy = function() { return this; };
Socket.prototype.setTimeout = function() { return this; };
Socket.prototype.setKeepAlive = function() { return this; };
Socket.prototype.setNoDelay = function() { return this; };

function noop() {}
function noopCb(cb) { if (typeof cb === 'function') cb(null); }

module.exports = {
  Server: BaseServer,
  Agent: BaseAgent,
  IncomingMessage: IncomingMessage,
  ServerResponse: ServerResponse,
  ClientRequest: EventEmitter,
  OutgoingMessage: EventEmitter,
  Socket: Socket,
  createServer: function() { return new BaseServer(); },
  createConnection: function() { return new Socket(); },
  connect: function() { return new Socket(); },
  request: function() { return new EventEmitter(); },
  get: function() { return new EventEmitter(); },
  globalAgent: new BaseAgent(),
  lookup: noopCb,
  resolve: noopCb,
  resolve4: noopCb,
  resolve6: noopCb,
  resolveCname: noopCb,
  resolveMx: noopCb,
  resolveNs: noopCb,
  resolveSrv: noopCb,
  resolveTxt: noopCb,
  reverse: noopCb,
  setServers: noop,
  getServers: function() { return []; },
  Resolver: EventEmitter,
  promises: {},
  METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  STATUS_CODES: {},
};
