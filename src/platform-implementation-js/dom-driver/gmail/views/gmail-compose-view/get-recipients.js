/* @flow */

import GmailComposeView from '../gmail-compose-view';

import getAddressInformationExtractor from './get-address-information-extractor';

// contactRowIndex values: 0:to, 1:cc, 2:bcc
export default function getRecipients(gmailComposeView: GmailComposeView, contactRowIndex: number, addressType: string): Contact[]{
	var contactRows = gmailComposeView.getRecipientRowElements();

	if(!contactRows || contactRows.length === 0){
		return [];
	}

	if(!contactRows[contactRowIndex]){
		return [];
	}

	const contacts = [];
	const candidateContacts = _extractPeopleContacts(gmailComposeView.getLogger(), contactRows[contactRowIndex], addressType);
	candidateContacts.forEach(contact => {
		if(contact != null){
			contacts.push(contact);
		}
	})

	return contacts;
};


function _getContactRows(gmailComposeView){
	return gmailComposeView.getElement().querySelectorAll('.GS tr');
}

function _extractPeopleContacts(logger, container, addressType){
	var peopleSpans = container.querySelectorAll('.vR');
	return Array.prototype.map.call(peopleSpans, getAddressInformationExtractor(logger, addressType));
}
