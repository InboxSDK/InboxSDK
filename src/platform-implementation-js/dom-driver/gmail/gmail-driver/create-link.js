/* @flow */

import _ from 'lodash';

import type GmailRouteProcessor from '../views/gmail-route-view/gmail-route-processor';

export default function createLink(GmailRouteProcessor: GmailRouteProcessor, routeID: string, params: any): string {
	params = !!params ? _.clone(params) : {};
	routeID = GmailRouteProcessor.getCompatibleRouteID(routeID);

	if(_.isString(params)){
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

	if(!params.page){
		params.page = 0;
	}

	var parts = routeID.split('/');
	var processedRoute = parts
							.map(function(part){
								if(part.indexOf(':') === -1){
									return part;
								}

								var colonParts = part.split(':');
								if(typeof params[colonParts[1]] !== 'undefined'){
									return colonParts[0] + params[colonParts[1]];
								}

								return colonParts[0];
							})
							.map(encodeURIComponent)
							.join('/');


	//check if link is of the form inbox/p0 or search/blah/p0
	if(GmailRouteProcessor.isListRouteName(parts[0]) && processedRoute.indexOf('p0') === processedRoute.length - 2){
		processedRoute = processedRoute.substring(0, processedRoute.length - 3);
	}

	return '#' + processedRoute;
}
