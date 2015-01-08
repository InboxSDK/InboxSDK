var _ = require('lodash');

function createLink(GmailRouteInfo, routeID, params){
	params = params || {};

	routeID = GmailRouteInfo.getCompatibleRouteID(routeID);

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
	if(GmailRouteInfo.isListRouteName(parts[0]) && processedRoute.indexOf('p0') === processedRoute.length - 2){
		processedRoute = processedRoute.substring(0, processedRoute.length - 3);
	}

	return location.origin + '/#' + processedRoute;
}

module.exports = createLink;
