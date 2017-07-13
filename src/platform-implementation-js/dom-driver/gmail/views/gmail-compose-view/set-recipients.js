/* @flow */

import type GmailComposeView from '../gmail-compose-view';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import getRecipients from './get-recipients';
import simulateClick from '../../../../lib/dom/simulate-click';
import simulateKey from '../../../../lib/dom/simulate-key';

const ADDRESS_TYPES = ['to', 'cc', 'bcc'];

// contactRowIndex values: 0:to, 1:cc, 2:bcc
export default function(gmailComposeView: GmailComposeView, contactRowIndex: number, emailAddresses: string[]) {
	if(_areContactsEqual(gmailComposeView, contactRowIndex, emailAddresses)){
		return;
	}

	const contactRows = gmailComposeView.getRecipientRowElements();

	if(!contactRows || contactRows.length === 0 || !contactRows[contactRowIndex]){
		return;
	}

	const contactRow = contactRows[contactRowIndex];
	const emailAddressEntry = contactRow.querySelector('textarea.vO');

	if(!emailAddressEntry || !(emailAddressEntry instanceof HTMLTextAreaElement)){
		return;
	}

	// Remove existing recipients
	Array.from(contactRow.querySelectorAll('.vR .vM')).forEach(el => {
		simulateClick(el);
	});

	emailAddressEntry.value = emailAddresses.join(',');

	// Push enter so Gmail interprets the addresses.
	simulateKey(emailAddressEntry, 13, 0);

	const oldRange = gmailComposeView.getLastSelectionRange();

	// Focus the recipients preview label so Gmail re-renders it.
	const cover = querySelector(gmailComposeView.getElement(), 'div.aoD.hl');
	cover.dispatchEvent(new FocusEvent('focus'));

	if (contactRowIndex == 1) {
		const ccButton = querySelector(gmailComposeView.getElement(), 'span.aB.gQ.pE');
		simulateClick(ccButton);
	} else if (contactRowIndex == 2) {
		const bccButton = querySelector(gmailComposeView.getElement(), 'span.aB.gQ.pB');
		simulateClick(bccButton);
	}

	// Then restore focus to what it was before.
	if (document.activeElement) {
		document.activeElement.blur();
	}
	if (oldRange) {
		const sel = document.getSelection();
		if (!sel) throw new Error();
		sel.removeAllRanges();
		sel.addRange(oldRange);
	}
}

function _areContactsEqual(gmailComposeView, contactRowIndex, emailAddresses){
	let existingEmailAddresses = getRecipients(gmailComposeView, contactRowIndex, ADDRESS_TYPES[contactRowIndex]).map(c => c.emailAddress);

	if(!emailAddresses){
		return !!existingEmailAddresses;
	}

	if(!existingEmailAddresses){
		return !!emailAddresses;
	}

	if(emailAddresses.length !== existingEmailAddresses.length){
		return false;
	}

	for(let ii=0; ii<existingEmailAddresses.length; ii++){
		let existingEmailAddress = existingEmailAddresses[ii];

		if(emailAddresses.indexOf(existingEmailAddress) === -1){
			return false;
		}
	}

	return true;
}
