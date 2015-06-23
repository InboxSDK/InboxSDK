/* @flow */
//jshint ignore:start

import _ from 'lodash';
import GmailElementGetter from '../gmail-element-getter';
import fakeWindowResize from '../../../lib/fake-window-resize';

export default function showNativeRouteView(gmailDriver: any) {
	var contentSectionElement = GmailElementGetter.getContentSectionElement();
	if(!contentSectionElement){
		return;
	}

	_.forEach((contentSectionElement:any).children, (child: HTMLElement) => {
		child.style.display = '';
	});

	if (document.body.classList.contains('inboxsdk__custom_view_active')) {
		document.body.classList.remove('inboxsdk__custom_view_active');
		fakeWindowResize();
	}
}
