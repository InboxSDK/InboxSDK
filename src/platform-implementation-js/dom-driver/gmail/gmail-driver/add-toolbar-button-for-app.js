/* @flow */

import type Kefir from 'kefir';
import GmailElementGetter from '../gmail-element-getter';
import GmailAppToolbarButtonView from '../views/gmail-app-toolbar-button-view';
import type GmailDriver from '../gmail-driver';

export default function addToolbarButtonForApp(gmailDriver: GmailDriver, buttonDescriptor: Kefir.Observable<Object>): Promise<GmailAppToolbarButtonView> {
	return GmailElementGetter.waitForGmailModeToSettle().then(() => {
		if(GmailElementGetter.isStandalone()) {
			return new Promise((resolve, reject) => {
				//never complete
			});
		} else {
			return new GmailAppToolbarButtonView(gmailDriver, buttonDescriptor);
		}
	});
}
