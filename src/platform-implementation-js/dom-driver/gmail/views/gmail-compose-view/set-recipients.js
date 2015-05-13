import _ from 'lodash';
import simulateClick from '../../../../lib/dom/simulate-click';
import simulateKey from '../../../../lib/dom/simulate-key';

// contactRowIndex values: 0:to, 1:cc, 2:bcc
export default function(gmailComposeView, contactRowIndex, emailAddresses){
	const contactRows = _getContactRows(gmailComposeView);

	if(!contactRows || contactRows.length === 0 || !contactRows[contactRowIndex]){
		return;
	}

	const contactRow = contactRows[contactRowIndex];
	const emailAddressEntry = contactRow.querySelector('textarea.vO');

	if(!emailAddressEntry){
		return;
	}

	// Remove existing recipients
	_.forEach(contactRow.querySelectorAll('.vR .vM'), el => {
		simulateClick(el);
	});

	emailAddressEntry.value = emailAddresses.join(',');

	// Push enter so Gmail interprets the addresses.
	simulateKey(emailAddressEntry, 13, 0);

	const oldRange = gmailComposeView.getLastSelectionRange();

	// Focus the recipients preview label so Gmail re-renders it.
	const cover = gmailComposeView.getElement().querySelector('div.aoD.hl');
	cover.dispatchEvent(new FocusEvent('focus'));

	if (contactRowIndex == 1) {
		const ccButton = gmailComposeView.getElement().querySelector('span.aB.gQ.pE');
		simulateClick(ccButton);
	} else if (contactRowIndex == 2) {
		const bccButton = gmailComposeView.getElement().querySelector('span.aB.gQ.pB');
		simulateClick(bccButton);
	}

	// Then restore focus to what it was before.
	if (document.activeElement) {
		document.activeElement.blur();
	}
	if (oldRange) {
		const sel = document.getSelection();
		sel.removeAllRanges();
		sel.addRange(oldRange);
	}
}

function _getContactRows(gmailComposeView){
	return gmailComposeView.getElement().querySelectorAll('.GS tr');
}
