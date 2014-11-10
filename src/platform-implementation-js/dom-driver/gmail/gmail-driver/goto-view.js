var getURLObject = require('./get-url-object');

function gotoView(gmailDriver, viewName, params){

	var newURL = gmailDriver.createLink(viewName, params);
	var currentURLObject = getURLObject(location.href);

	if(currentURLObject.query){
		newURL += '?' + currentURLObject.query;
	}

	location.hash = newURL.split('#')[1];
}

module.exports = gotoView;
