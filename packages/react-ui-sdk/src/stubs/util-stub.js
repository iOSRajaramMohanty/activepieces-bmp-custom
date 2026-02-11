// Browser-compatible polyfill for Node.js util module
// Used by form-data/delayed-stream and other dependencies

// util.inherits polyfill
// This is a simplified version of Node.js util.inherits
// It sets up prototype chain inheritance
function inherits(ctor, superCtor) {
  if (superCtor === null || superCtor === undefined) {
    throw new TypeError('The super constructor must be a non-null or non-undefined object');
  }
  
  // Set the prototype
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
}

// Export as CommonJS module
module.exports = {
  inherits: inherits,
  // Add other util functions if needed
  inspect: function(obj) {
    return JSON.stringify(obj, null, 2);
  }
};
