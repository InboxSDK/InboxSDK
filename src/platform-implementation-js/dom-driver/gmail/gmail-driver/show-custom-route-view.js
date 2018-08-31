/* @flow */

import {defn} from 'ud';
import GmailElementGetter from '../gmail-element-getter';

const ACTIVE_ADD_ON_ICON_SELECTOR = '.J-KU-KO';
import {simulateClick} from '../../../lib/dom/simulate-mouse-event';

const showCustomRouteView = defn(module, function showCustomRouteView(gmailDriver: any, element: HTMLElement) {
	const contentSectionElement = GmailElementGetter.getContentSectionElement();
	if(!contentSectionElement){
		return;
	}

	const selection = (document:any).getSelection();
	for (let i=0; i<selection.rangeCount; i++) {
		const range: Range = selection.getRangeAt(i);
		if (typeof (range: any).intersectsNode === 'function' && (range: any).intersectsNode(contentSectionElement)) {
			selection.removeAllRanges();
			break;
		}
	}

	const customViewContainerElement = _getCustomViewContainerElement(contentSectionElement);
	customViewContainerElement.appendChild(element);

	const children = (contentSectionElement:any).children;
	Array.prototype.forEach.call(children, (child: HTMLElement) => {
		if(child.classList.contains('inboxsdk__custom_view')){
			return;
		}

		child.style.display = 'none';
	});

	//if any thread sidebar addons are enabled then we need to turn them off
	const companionSidebarIconContainerEl = GmailElementGetter.getCompanionSidebarIconContainerElement();
	if(companionSidebarIconContainerEl){
		const activeThreadAddOnIcon = companionSidebarIconContainerEl.querySelector(ACTIVE_ADD_ON_ICON_SELECTOR);
		if(activeThreadAddOnIcon){
			simulateClick(activeThreadAddOnIcon);
		}
	}

	((document.body:any):HTMLElement).classList.add('inboxsdk__custom_view_active');
});
export default showCustomRouteView;

function _getCustomViewContainerElement(contentSectionElement: HTMLElement): HTMLElement {
	let customViewContainerElement = contentSectionElement.querySelector('.inboxsdk__custom_view');
	if(customViewContainerElement){
		return customViewContainerElement;
	}

	customViewContainerElement = document.createElement('div');
	customViewContainerElement.classList.add('inboxsdk__custom_view');

	contentSectionElement.appendChild(customViewContainerElement);

	return customViewContainerElement;
}
