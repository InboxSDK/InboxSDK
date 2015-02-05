var updateIconUrl = require('./update-icon-url');
var updateIconClass = require('./update-icon-class');

// TODO make this into just one class
module.exports = function(iconSettings, containerElement, append, iconClass, iconUrl){

	updateIconUrl.apply(iconSettings, [containerElement, append, iconUrl]);
	updateIconClass.apply(iconSettings, [containerElement, append, iconClass]);

};
