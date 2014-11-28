var _ = require('lodash');

function Symbol(description) {
  if (this === Symbol) {
    throw new TypeError("Can't use new with Symbol constructor");
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
