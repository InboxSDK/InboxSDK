// Takes an input function, and returns {fn, revoke}.
// Before revoke is called, calling fn is equivalent to calling the input
// function.
// After revoke is called, calling fn is a no-op, and fn no longer holds a
// reference to inputFn.
// The revoke function does not hold a reference to inputFn or revokedFn ever.

// The optional second parameter revokedFn is a function to make fn call after
// it has been revoked.

import _ from 'lodash';

export default function makeRevocableFunction(inputFn, revokedFn=_.noop) {
  var key = {};

  return {
    fn: (function() {
      const _revokedFn = revokedFn;
      const wm = new WeakMap();
      wm.set(key, inputFn);
      inputFn = revokedFn = null;

      return function() {
        return (key ? wm.get(key) : _revokedFn).apply(this, arguments);
      };
    })(),
    revoke: _.once(function() {
      key = null;
    })
  };
}
