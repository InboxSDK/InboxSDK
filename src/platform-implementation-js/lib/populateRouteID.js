/* @flow */

import type {RouteParams} from '../namespaces/router';

export default function populateRouteID(routeID: string, params: ?RouteParams): string {
  const paramsObject = params || {};
  const usedParams = new Set();
  const result = routeID.replace(/:([^/]+)/g, (whole: string, term: string) => {
    if (term in paramsObject) {
      usedParams.add(term);
      return encodeURIComponent(String(paramsObject[term]));
    } else {
      throw new Error(`Missing param: ${term}`);
    }
  });
  if (Object.keys(paramsObject).length !== usedParams.size) {
    throw new Error('Extra parameters given');
  }
  return result;
}
