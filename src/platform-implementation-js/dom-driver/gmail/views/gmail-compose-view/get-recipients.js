/* @flow */

import GmailComposeView from '../gmail-compose-view';
import Logger from '../../../../lib/logger';

import getAddressInformationExtractor from './get-address-information-extractor';

export default function getRecipients(
	gmailComposeView: GmailComposeView,
	addressType: ReceiverType
): Contact[] {
	let contactRow;
	try {
		contactRow = gmailComposeView.getRecipientRowForType(addressType);
	} catch (err) {
		Logger.error(err, {addressType});
		return [];
	}

	const candidateContacts = _extractPeopleContacts(contactRow, addressType, gmailComposeView);
	const contacts = candidateContacts.filter(Boolean);
	return contacts;
}

function _extractPeopleContacts(container, addressType, gmailComposeView) {
	const peopleSpans = container.querySelectorAll('.vR');
	return Array.prototype.map.call(peopleSpans, getAddressInformationExtractor(addressType, gmailComposeView));
}
