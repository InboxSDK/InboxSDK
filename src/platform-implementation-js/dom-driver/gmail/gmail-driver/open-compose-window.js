/* @flow */

import simulateClick from '../../../lib/dom/simulate-click';
import GmailElementGetter from '../gmail-element-getter';

import waitFor from '../../../lib/wait-for';

import type GmailDriver from '../gmail-driver';

export default function openComposeWindow(gmailDriver: GmailDriver){

	GmailElementGetter.waitForGmailModeToSettle().then(function(){

		if(GmailElementGetter.isStandaloneComposeWindow() || GmailElementGetter.isStandaloneThreadWindow()){
			//do nothing
			return;
		}

		waitFor(function(){
			return !!GmailElementGetter.getComposeButton();
		}).then(function(){
			simulateClick(GmailElementGetter.getComposeButton());
		});

	});

};
