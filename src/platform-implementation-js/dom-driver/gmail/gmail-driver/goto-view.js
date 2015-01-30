var getURLObject = require('./get-url-object');

module.exports = function(gmailDriver, viewName, params){

	var newURL = gmailDriver.createLink(viewName, params);
	var currentURLObject = getURLObject(location.href);

	// Gmail changes the hash after location changes to re-add the query string
	// and breaks the back button, so we need to work around that.

	if(currentURLObject.query){
		newURL += '?' + currentURLObject.query;
	}

	window.location.hash = newURL.split('#')[1];
};
