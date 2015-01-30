var getURLObject = require('./get-url-object');

module.exports = function(gmailDriver, viewName, params){
	window.location = gmailDriver.createLink(viewName, params);
};
