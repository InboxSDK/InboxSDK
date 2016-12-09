/* @flow */

import _ from 'lodash';

const routeIDtoRegExp: (routeID: string) => RegExp = _.memoize(routeID =>
	new RegExp('^'+_.escapeRegExp(routeID).replace(/\/:[^/]+/g, '/([^/]+)')+'/?$')
);

export default function routeIDmatchesHash(routeID: string|Array<string>, hash: string): ?string {
	const routeIDs = Array.isArray(routeID) ? routeID : [routeID];
	return _.find(routeIDs, routeID => hash.match(routeIDtoRegExp(routeID)));
}
