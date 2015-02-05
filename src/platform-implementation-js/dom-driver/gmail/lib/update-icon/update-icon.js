var updateIconUrl = require('./update-icon-url');
var updateIconClass = require('./update-icon-class');

module.exports = function(iconSettings, containerElement, append, iconClass, iconUrl){

	updateIconUrl.apply(iconSettings, [containerElement, append, iconUrl]);

	if(iconUrl){
		if(iconSettings._iconElement){
			iconSettings._iconElement.remove();
			iconSettings._iconElement = null;
		}

		return;
	}

	updateIconClass.apply(iconSettings, [containerElement, append, iconClass]);

};
