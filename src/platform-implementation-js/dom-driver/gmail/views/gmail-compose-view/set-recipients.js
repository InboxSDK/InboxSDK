import _ from 'lodash';
import simulateClick from '../../../../lib/dom/simulate-click';
import simulateKey from '../../../../lib/dom/simulate-key';

_.assign(window, {simulateClick, simulateKey});

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

	const newEvent = document.createEvent('Events');
	newEvent.initEvent('input', true, true);
	emailAddressEntry.dispatchEvent(newEvent);

	simulateKey(emailAddressEntry, 13, 0);

	const oldRange = gmailComposeView.getLastSelectionRange();

	const cover = gmailComposeView.getElement().querySelector('div.aoD.hl');
	const focusEvent = new FocusEvent('focus');
	cover.dispatchEvent(focusEvent);

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
