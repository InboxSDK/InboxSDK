/* @flow */

import GmailElementGetter from '../gmail-element-getter';
import fakeWindowResize from '../../../lib/fake-window-resize';

export default function showNativeRouteView(gmailDriver: any) {
	const contentSectionElement = GmailElementGetter.getContentSectionElement();
	if(!contentSectionElement){
		return;
	}

	Array.prototype.forEach.call((contentSectionElement:any).children, (child: HTMLElement) => {
		child.style.display = '';
	});

	if (((document.body:any):HTMLElement).classList.contains('inboxsdk__custom_view_active')) {
		((document.body:any):HTMLElement).classList.remove('inboxsdk__custom_view_active');
		// Work around issue where Gmail sometimes screws up its formatting until
		// the user resizes their screen. Reproduction steps that sometimes work:
		// use multiple inboxes lab, with multiple inboxes set below the inbox, go
		// to a pipeline, resize the window slightly, and then go to inbox.
		fakeWindowResize();
	}
}
