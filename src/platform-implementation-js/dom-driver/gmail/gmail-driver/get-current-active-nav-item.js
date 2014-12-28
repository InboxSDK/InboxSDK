var NativeGmailNavItemView = require('../views/native-gmail-nav-item-view');

var GmailElementGetter = require('../gmail-element-getter');

module.exports = function(){
	var currentActive = GmailElementGetter.getLeftNavContainerElement().querySelector('.ain');

	if(!currentActive){
		return null;
	}

	if(!currentActive.classList.contains('aim')){
		currentActive = currentActive.parentElement;
	}

	if(!currentActive){
		return null;
	}

	if(currentActive.classList.contains('inboxsdk__navItem_active_claimed') && !currentActive.__activeClaimed){
		return null;
	}

	currentActive.classList.add('inboxsdk__navItem_active_claimed');
	currentActive.__activeClaimed = true;

	if(!currentActive.__nativeGmailNavItemView){
		currentActive.__nativeGmailNavItemView = new NativeGmailNavItemView(currentActive);
	}

	return currentActive.__nativeGmailNavItemView;
};
