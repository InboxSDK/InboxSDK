function createLink(gmailDriver, viewName, params){

	var paramsString = '';
	if(params){
		params.forEach(function(param){
			paramsString += '/' + encodeURIComponent(param);
		});
	}

	return location.origin + '/#' + encodeURIComponent(viewName) + paramsString;

}

module.exports = createLink;
