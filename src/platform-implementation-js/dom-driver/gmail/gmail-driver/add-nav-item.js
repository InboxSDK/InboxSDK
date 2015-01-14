'use strict';

var GmailElementGetter = require('../gmail-element-getter');
var GmailNavItemView = require('../views/gmail-nav-item-view');

var waitFor = require('../../../lib/wait-for');
var eventNameFilter = require('../../../lib/event-name-filter');
var getInsertBeforeElement = require('../../../lib/dom/get-insert-before-element');
var makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');

module.exports = function(orderGroup, navItemDescriptor){
	var gmailNavItemView = new GmailNavItemView(orderGroup, 1);

	var attacher = _attachNavItemView(gmailNavItemView);

	GmailElementGetter
		.waitForGmailModeToSettle()
		.then(_waitForNavItemsHolder)
		.then(attacher);

	gmailNavItemView
		.getEventStream()
		.filter(eventNameFilter('orderChanged'))
		.takeWhile(function(){
			return !!GmailElementGetter.getNavItemMenuInjectionContainer();
		})
		.onValue(attacher);

	gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

	return gmailNavItemView;
};

function _waitForNavItemsHolder(){
	if(GmailElementGetter.isStandalone()){
		return;
	}

	return waitFor(function(){
		return !!GmailElementGetter.getNavItemMenuInjectionContainer();
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

	var navMenuInjectionContainer = GmailElementGetter.getNavItemMenuInjectionContainer();
	navMenuInjectionContainer.children[2].insertAdjacentElement('beforebegin', holder);

	makeMutationObserverStream(holder, {attributes: true, attributeFilter: ['class']}).onValue(function(){
		if(holder.classList.contains('TA')){
			holder.classList.remove('TA');
		}
	});

	return holder.querySelector('.TK');
}
