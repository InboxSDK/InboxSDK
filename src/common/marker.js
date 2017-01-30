/* @flow */

import constant from 'lodash/constant';

export default function Marker(description?: string): {name: ?string} {
  if (this instanceof Marker) {
    throw new TypeError("Can't use new with Marker function");
  }
  const strFnOpts = {
    value: Object.freeze(constant('[Marker'+(description?' '+description:'')+']'))
  };
  return (Object:any).defineProperties({
    name: description
  }, {
    length: {value: 1},
    nodeType: {value: 1},
    inspect: strFnOpts, toString: strFnOpts, valueOf: strFnOpts
  });
}
