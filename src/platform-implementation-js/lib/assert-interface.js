var _ = require('lodash');
var assert = require('assert');

// Deprecated. Use Flow types instead! See the __interfaceCheck function in
// gmail-driver.js.

export default function assertInterface(object, interface_) {
  // Currently there's no way at runtime to query what interfaces an object
  // implements. If we ever want to do that in the future, here's an example of
  // a good way to.
  // if (!_.has(object, 'interfaces')) {
  //   object.interfaces = new Set();
  // }
  if (process.env.NODE_ENV !== 'production') {
    var name, value;
    for ([name, value] of _.pairs(interface_)) {
      assert.strictEqual(typeof object[name], 'function',
        `check object has ${name} method`);
      if (value) {
        var argCount = typeof value === 'number' ? value : value.length;
        assert.strictEqual(object[name].length, argCount,
          `check that object's ${name} method has right number of parameters`);
      }
    }
  }

  // object.interfaces.add(interface_);
}
