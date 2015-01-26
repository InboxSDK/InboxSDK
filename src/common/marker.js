var _ = require('lodash');

function Marker(description) {
  if (this instanceof Marker) {
    throw new TypeError("Can't use new with Marker function");
  }
  var strFnOpts = {
    value: Object.freeze(_.constant('[Marker'+(description?' '+description:'')+']'))
  };
  // TODO Re-enable Object.freeze once 6to5 is updated to use core-js >= 0.4.9
  return /*Object.freeze*/(Object.defineProperties({
    name: description
  }, {
    length: {value: 1},
    inspect: strFnOpts, toString: strFnOpts, valueOf: strFnOpts
  }));
}

module.exports = Marker;
