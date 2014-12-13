var getAddressInformationExtractor = require('./get-address-information-extractor');

module.exports = function(gmailComposeView, contactRowIndex, addressType){
	var contactRows = gmailComposeView.getRecipientRowElements();

	if(!contactRows || contactRows.length === 0){
		return [];
	}

	if(!contactRows[contactRowIndex]){
		return [];
	}

	return _extractPeopleContacts(contactRows[contactRowIndex], addressType);
};


function _getContactRows(gmailComposeView){
	return gmailComposeView.getElement().querySelectorAll('.GS tr');
}

function _extractPeopleContacts(container, addressType){
	var peopleSpans = container.querySelectorAll('.vR');
	return Array.prototype.map.call(peopleSpans, getAddressInformationExtractor(addressType));
}
