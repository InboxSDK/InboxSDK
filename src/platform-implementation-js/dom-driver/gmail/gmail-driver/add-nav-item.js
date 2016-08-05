/* @flow */
//jshint ignore:start

import $ from 'jquery';
import Kefir from 'kefir';
import GmailElementGetter from '../gmail-element-getter';
import GmailNavItemView from '../views/gmail-nav-item-view';
import waitFor from '../../../lib/wait-for';
import eventNameFilter from '../../../lib/event-name-filter';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';

export default function addNavItem(orderGroup: string, navItemDescriptor: Kefir.Stream<Object>): GmailNavItemView {
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
}

function _waitForNavItemsHolder(): Promise<any> {
	if(GmailElementGetter.isStandalone()){
		return Promise.resolve();
	}

	return waitFor(function(){
		return !!GmailElementGetter.getNavItemMenuInjectionContainer();
	});
}

function _attachNavItemView(gmailNavItemView){
	return function(){
		insertElementInOrder(_getNavItemsHolder(), gmailNavItemView.getElement());
	};
}


function _getNavItemsHolder(): HTMLElement {
	var holder = document.querySelector('.inboxsdk__navMenu');
	if(!holder){
		return _createNavItemsHolder();
	}
	else{
		return holder.querySelector('.TK');
	}
}

function _createNavItemsHolder(): HTMLElement {
	var holder = document.createElement('div');
	holder.setAttribute('class', 'LrBjie inboxsdk__navMenu');
	holder.innerHTML = '<div class="TK"></div>';

	var navMenuInjectionContainer = GmailElementGetter.getNavItemMenuInjectionContainer();
	navMenuInjectionContainer.insertBefore(holder, navMenuInjectionContainer.children[2]);

	makeMutationObserverStream(holder, {attributes: true, attributeFilter: ['class']}).onValue(function(){
		if(holder.classList.contains('TA')){
			holder.classList.remove('TA');
		}
	});

	return holder.querySelector('.TK');
}
