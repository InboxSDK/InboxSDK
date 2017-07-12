/* @flow */

import memoize from 'lodash/memoize';
import find from 'lodash/find';
import escapeRegExp from 'lodash/escapeRegExp';

const routeIDtoRegExp: (routeID: string) => RegExp = memoize(routeID =>
	new RegExp('^'+escapeRegExp(routeID).replace(/\/:[^/]+/g, '/([^/]+)')+'/?$')
);

export default function routeIDmatchesHash(routeID: string|Array<string>, hash: string): ?string {
	const routeIDs = Array.isArray(routeID) ? routeID : [routeID];
	return find(routeIDs, routeID => hash.match(routeIDtoRegExp(routeID)));
}
