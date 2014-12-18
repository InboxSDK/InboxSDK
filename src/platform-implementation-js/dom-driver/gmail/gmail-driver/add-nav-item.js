var GmailElementGetter = require('../gmail-element-getter');
var GmailNavItemView = require('../views/gmail-nav-item-view');

var waitFor = require('../../../lib/wait-for');
var eventNameFilter = require('../../../lib/event-name-filter');
var getInsertBeforeElement = require('../../../lib/dom/get-insert-before-element');

module.exports = function(orderGroup, navItemDescriptor){
	var gmailNavItemView = new GmailNavItemView(orderGroup);

	var attacher = _attachNavItemView(gmailNavItemView);

	GmailElementGetter
		.waitForGmailModeToSettle()
		.then(_waitForNavItemsHolder)
		.then(attacher);

	gmailNavItemView
		.getEventStream()
		.filter(eventNameFilter('orderChanged'))
		.onValue(attacher);

	gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

	return gmailNavItemView;
};

function _waitForNavItemsHolder(){
	if(GmailElementGetter.isStandalone()){
		return;
	}

	return waitFor(function(){
		return GmailElementGetter.getNavItemHolders().length > 0;
	});
}

function _attachNavItemView(gmailNavItemView){
	return function(){
		var holder = _getNavItemsHolder();

		var insertBeforeElement = getInsertBeforeElement(gmailNavItemView.getElement(), holder.children, ['data-group-order-hint', 'data-order-hint', 'data-insertion-order-hint']);
		holder.insertBefore(gmailNavItemView.getElement(), insertBeforeElement);
	};
}


function _getNavItemsHolder(){
	var holder = document.querySelector('.inboxsdk__navMenu');
	if(!holder){
		return _createNavItemsHolder();
	}
	else{
		return holder.querySelector('.TK');
	}
}

function _createNavItemsHolder(){
	var holder = document.createElement('div');
	holder.setAttribute('class', 'LrBjie inboxsdk__navMenu');
	holder.innerHTML = '<div class="TK"></div>';

	var gmailNavItemHolders = GmailElementGetter.getNavItemHolders();
	gmailNavItemHolders[1].insertAdjacentElement('beforebegin', holder);

	return holder.querySelector('.TK');
}
