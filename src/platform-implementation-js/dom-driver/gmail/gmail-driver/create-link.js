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

	var parts = routeID.split('/');
	var processedRoute = parts
							.map(function(part){
								if(part.indexOf(':') === -1){
									return part;
								}

								var colonParts = part.split(':');
								if(params[colonParts[1]]){
									return colonParts[0] + params[colonParts[1]];
								}

								return colonParts[0];
							})
							.map(encodeURIComponent)
							.join('/');

	return location.origin + '/#' + processedRoute;
}

module.exports = createLink;
