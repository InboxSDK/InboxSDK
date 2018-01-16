/* @flow */

import Kefir from 'kefir';
import GmailElementGetter from '../gmail-element-getter';
import GmailNavItemView from '../views/gmail-nav-item-view';
import Logger from '../../../lib/logger';
import waitFor from '../../../lib/wait-for';
import eventNameFilter from '../../../lib/event-name-filter';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';
import querySelector from '../../../lib/dom/querySelectorOrFail';

import type GmailDriver from '../gmail-driver';

export default function addNavItem(driver: GmailDriver, orderGroup: string, navItemDescriptor: Kefir.Observable<Object>): GmailNavItemView {
	const gmailNavItemView = new GmailNavItemView(driver, orderGroup, 1);

	const attacher = _attachNavItemView(gmailNavItemView);

	if (!GmailElementGetter.isStandalone()) {
		GmailElementGetter
			.waitForGmailModeToSettle()
			.then(_waitForNavItemsHolder)
			.then(() => {
				attacher();

				gmailNavItemView
					.getEventStream()
					.filter(eventNameFilter('orderChanged'))
					.takeWhile(() => !!GmailElementGetter.getNavItemMenuInjectionContainer())
					.onValue(attacher);
			})
			.catch(err => Logger.error(err));
	}

	gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

	return gmailNavItemView;
}

function _waitForNavItemsHolder(): Promise<any> {
	return waitFor(() => !!GmailElementGetter.getNavItemMenuInjectionContainer());
}

function _attachNavItemView(gmailNavItemView){
	return function(){
		insertElementInOrder(_getNavItemsHolder(), gmailNavItemView.getElement());
	};
}


function _getNavItemsHolder(): HTMLElement {
	const holder = document.querySelector('.inboxsdk__navMenu');
	if(!holder){
		return _createNavItemsHolder();
	}
	else{
		return querySelector(holder, '.TK');
	}
}

function _createNavItemsHolder(): HTMLElement {
	const holder = document.createElement('div');
	holder.setAttribute('class', 'LrBjie inboxsdk__navMenu');
	holder.innerHTML = '<div class="TK"></div>';

	const navMenuInjectionContainer = GmailElementGetter.getNavItemMenuInjectionContainer();
	if (!navMenuInjectionContainer) throw new Error('should not happen');
	navMenuInjectionContainer.insertBefore(holder, navMenuInjectionContainer.children[2]);

	makeMutationObserverStream(holder, {attributes: true, attributeFilter: ['class']}).onValue(function(){
		if(holder.classList.contains('TA')){
			holder.classList.remove('TA');
		}
	});

	return querySelector(holder, '.TK');
}
