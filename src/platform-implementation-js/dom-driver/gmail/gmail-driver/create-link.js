var _ = require('lodash');

function createLink(gmailDriver, viewName, params){

	var paramsString = '';
	if(params){
		if(_.isArray(params)){
			params.forEach(function(param){
				paramsString += '/' + encodeURIComponent(param);
			});
		}
		else {
			paramsString += '/' + encodeURIComponent('' + params);
		}		
	}

	return location.origin + '/#' + encodeURIComponent(viewName) + paramsString;

}

module.exports = createLink;
