var GmailNavItemView = require('../views/gmail-nav-item-view');

var GmailElementGetter = require('../gmail-element-getter');

module.exports = function(){
	var currentActive = GmailElementGetter.getLeftNavContainerElement().querySelector('.ain');
	return new GmailNavItemView(null, null, currentActive);
};
