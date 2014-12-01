var _ = require('lodash');

function Symbol(description) {
  if (this instanceof Symbol) {
    throw new TypeError("Can't use new with Symbol function");
  }
  var strFnOpts = {value: _.constant('[Symbol'+(description?' '+description:'')+']')};
  return Object.freeze(Object.defineProperties({
    name: description
  }, {
    length: {value: 1},
    inspect: strFnOpts, toString: strFnOpts, valueOf: strFnOpts
  }));
}

module.exports = Symbol;
