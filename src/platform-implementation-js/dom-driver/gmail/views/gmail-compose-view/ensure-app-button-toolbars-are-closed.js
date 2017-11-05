/* @flow */

import simulateClick from '../../../../lib/dom/simulate-click';

export default function ensureAppButtonToolbarsAreClosed(gmailComposeViewElement: HTMLElement) {
	var groupedButton = gmailComposeViewElement.querySelector('.inboxsdk__compose_groupedActionButton');
	if(!groupedButton){
		return; //no group button so we're good
	}

	if(gmailComposeViewElement.classList.contains('inboxsdk__compose_groupedActionToolbar_visible')){
		simulateClick(groupedButton);
	}
}
