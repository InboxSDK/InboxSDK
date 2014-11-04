module.exports = function(gmailComposeView, contactRowIndex, emailAddresses){
	var contactRows = _getContactRows(gmailComposeView);

	if(!contactRows || contactRows.length === 0){
		return;
	}

	if(!contactRows[contactRowIndex]){
		return;
	}

	var contactRow = contactRows[contactRowIndex];
	var emailAddressEntry = contactRow.querySelector('.vO');

	if(!emailAddressEntry){
		return;
	}

	emailAddressEntry.value = emailAddresses.join(',');
};


function _getContactRows(gmailComposeView){
	return gmailComposeView.getElement().querySelectorAll('.GS tr');
}
