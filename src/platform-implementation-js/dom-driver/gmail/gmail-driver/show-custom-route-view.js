/* @flow */
//jshint ignore:start

import GmailElementGetter from '../gmail-element-getter';

export default function showCustomRouteView(gmailDriver: any, element: HTMLElement) {
	var contentSectionElement = GmailElementGetter.getContentSectionElement();
	if(!contentSectionElement){
		return;
	}

	var customViewContainerElement = _getCustomViewContainerElement(contentSectionElement);
	customViewContainerElement.appendChild(element);

	var children = (contentSectionElement:any).children;
	Array.prototype.forEach.call(children, (child: HTMLElement) => {
		if(child.classList.contains('inboxsdk__custom_view')){
			return;
		}

		child.style.display = 'none';
	});

	document.body.classList.add('inboxsdk__custom_view_active');
}

function _getCustomViewContainerElement(contentSectionElement: HTMLElement): HTMLElement {
	var customViewContainerElement = contentSectionElement.querySelector('.inboxsdk__custom_view');
	if(customViewContainerElement){
		return customViewContainerElement;
	}

	customViewContainerElement = document.createElement('div');
	customViewContainerElement.classList.add('inboxsdk__custom_view');

	contentSectionElement.appendChild(customViewContainerElement);

	return customViewContainerElement;
}
