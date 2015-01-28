var _ = require('lodash');

function Marker(description) {
  if (this instanceof Marker) {
    throw new TypeError("Can't use new with Marker function");
  }
  var strFnOpts = {
    value: Object.freeze(_.constant('[Marker'+(description?' '+description:'')+']'))
  };
  return Object.freeze(Object.defineProperties({
    name: description
  }, {
    length: {value: 1},
    inspect: strFnOpts, toString: strFnOpts, valueOf: strFnOpts
  }));
}

module.exports = Marker;
