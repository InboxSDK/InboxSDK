var NativeGmailNavItemView = require('../views/native-gmail-nav-item-view');

var GmailElementGetter = require('../gmail-element-getter');

module.exports = function(){
	var currentActive = GmailElementGetter.getLeftNavContainerElement().querySelector('.ain');
	if(!currentActive || currentActive.classList.contains('inboxsdk__navItem_claimed')){
		return null;
	}

	return new NativeGmailNavItemView(currentActive);
};
