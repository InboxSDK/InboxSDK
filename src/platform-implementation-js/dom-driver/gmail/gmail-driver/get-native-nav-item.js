var NativeGmailNavItemView = require('../views/native-gmail-nav-item-view');
var $ = require('jquery');
var GmailElementGetter = require('../gmail-element-getter');

module.exports = function(label){
	var labelLinkElement = $(GmailElementGetter.getLeftNavContainerElement()).find('.aim a[href*=#' + label + ']');

	if(labelLinkElement.length === 0){
		return null;
	}

	var labelElement = labelLinkElement.closest('.aim')[0];

	if(!labelElement){
		return null;
	}

	if(!labelElement.__nativeGmailNavItemView){
		labelElement.__nativeGmailNavItemView = new NativeGmailNavItemView(labelElement);
	}

	return labelElement.__nativeGmailNavItemView;
};
