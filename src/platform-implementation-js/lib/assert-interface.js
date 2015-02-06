const _ = require('lodash');
const assert = require('assert');

function assertInterface(object, interface_) {
  // if (!_.has(object, 'interfaces')) {
  //   object.interfaces = new Set();
  // }
  if (process.env.NODE_ENV !== 'production') {
    for (let [name, value] of _.pairs(interface_)) {
      assert.strictEqual(typeof object[name], 'function',
        'check object has '+name+' method');
      if (value) {
        const argCount = typeof value === 'number' ? value : value.length;
        assert.strictEqual(object[name].length, argCount,
          "check that object's "+name+" method has right number of parameters");
      }
    }
  }

  // object.interfaces.add(interface_);
}

module.exports = assertInterface;
