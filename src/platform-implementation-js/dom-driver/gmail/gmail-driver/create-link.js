/* @flow */

import _ from 'lodash';

import populateRouteID from '../../../lib/populateRouteID';
import Logger from '../../../lib/logger';

import type {RouteParams} from '../../../namespaces/router';
import type GmailRouteProcessor from '../views/gmail-route-view/gmail-route-processor';

export default function createLink(GmailRouteProcessor: GmailRouteProcessor, routeID: string, params: ?RouteParams|string): string {
	params = !!params ? _.clone(params) : {};
	routeID = GmailRouteProcessor.getCompatibleRouteID(routeID);

	if(typeof params === 'string'){
		var matches = routeID.match(/:/g);
		if(matches && matches.length === 1){
			var paramValue = params;
			params = {};
			params[routeID.match(/:(\w+)($|\/)?/)[1]] = paramValue;
		}
		else{
			params = {};
		}
	}

	const hasPageParam = routeID.match(/:page(?:\/|$)/);
	if(hasPageParam && !params.page){
		params.page = 0;
	}

	const parts = routeID.split('/');

	// attempt to use new, more strict populateRouteID fn, if that fails
	// log an error and fallback to older, more permissive approach.
	// intent is to retire the old approach once we understand the consequences.
	let processedRoute: string;
	try {
		processedRoute = populateRouteID(routeID, params);
	} catch (error) {
		Logger.error(error, {
			routeID,
			paramsKey: Object.keys(params)
		});

		processedRoute = parts
							.map(function(part){
								if(part.indexOf(':') === -1){
									return part;
								}

								const colonParts = part.split(':');
								if(params && typeof params[colonParts[1]] !== 'undefined'){
									return colonParts[0] + params[colonParts[1]];
								}

								return colonParts[0];
							})
							.map(encodeURIComponent)
							.join('/');
	}


	//check if link is of the form inbox/p0 or search/blah/p0
	if(GmailRouteProcessor.isListRouteName(parts[0]) && processedRoute.indexOf('p0') === processedRoute.length - 2){
		processedRoute = processedRoute.substring(0, processedRoute.length - 3);
	}

	return '#' + processedRoute;
}
