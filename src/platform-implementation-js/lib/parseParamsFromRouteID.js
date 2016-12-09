/* @flow */

import _ from 'lodash';

export default function parseParamsFromRouteID(routeID: string, hash: string): {[ix:string]: string} {
  const params = Object.create(null);
  _.zip(routeID.split('/'), hash.split('/')).forEach(([routePart, hashPart], i) => {
    if (routePart[0] === ':') {
      params[routePart.slice(1)] = decodeURIComponent(hashPart.replace(/\+/g, ' '));
    }
  });
  return Object.freeze(params);
}
