/* @flow */

import _ from 'lodash';
import $ from 'jquery';
import RSVP from 'rsvp';

import simulateClick from '../../../../lib/dom/simulate-click';
import setValueAndDispatchEvent from '../../../../lib/dom/set-value-and-dispatch-event';

import type GmailComposeView from '../gmail-compose-view';

export default function insertLinkIntoBody(gmailComposeView: GmailComposeView, text: string, href: string): ?HTMLElement {
	return _insertLinkIntoBody(gmailComposeView, text, href);
}

function _insertLinkIntoBody(gmailComposeView, text, href){
	gmailComposeView.focus();

	var composeBodyElement = $(gmailComposeView.getBodyElement());
	composeBodyElement.focus();


	let newLink;

	const selection = document.getSelection();
	if(selection && !selection.isCollapsed && selection.rangeCount > 0){
		const range = selection.getRangeAt(0);
		newLink = document.createElement('a');
		newLink.href = href;
		range.surroundContents(newLink);
	}
	else{
		const existingLinks = composeBodyElement.find('a[href="'+href+'"]');
		simulateClick(gmailComposeView.getInsertLinkButton());

		if($('#linkdialog-text').length === 0){
			return;
		}

		setValueAndDispatchEvent($('#linkdialog-onweb-tab-input')[0], href, 'input');

		simulateClick($('button[name=ok]')[0]);

		const existingAndNewLinks = composeBodyElement.find('a[href="'+href+'"]');
		for(let ii=0; ii<existingAndNewLinks.length; ii++){
			const potentialLink = existingAndNewLinks[ii];
			let matchFound = false;
			for(let jj=0; jj<existingLinks.length; jj++){
				if(potentialLink === existingLinks[jj]){
					matchFound = true;
					break;
				}
			}

			if(!matchFound){
				newLink = potentialLink;
				break;
			}
		}

		if(newLink) newLink.textContent = text;
	}
	if(selection && newLink){
		selection.selectAllChildren(newLink);
		selection.collapseToEnd();
	}


	return newLink;
}
