/* @flow */
//jshint ignore:start

import _ from 'lodash';

export default function Marker(description?: string): {name: ?string} {
  if (this instanceof Marker) {
    throw new TypeError("Can't use new with Marker function");
  }
  var strFnOpts = {
    value: Object.freeze(_.constant('[Marker'+(description?' '+description:'')+']'))
  };
  return Object.freeze((Object:any).defineProperties({
    name: description
  }, {
    length: {value: 1},
    nodeType: {value: 1},
    inspect: strFnOpts, toString: strFnOpts, valueOf: strFnOpts
  }));
}
