module.exports = function(gmailComposeView, contactRowIndex){
	var contactRows = gmailComposeView.getRecipientRowElements();

	if(!contactRows || contactRows.length === 0){
		return [];
	}

	if(!contactRows[contactRowIndex]){
		return [];
	}

	return _extractPeopleContacts(contactRows[contactRowIndex]);
};


function _getContactRows(gmailComposeView){
	return gmailComposeView.getElement().querySelectorAll('.GS tr');
}

function _extractPeopleContacts(container){
	var people = [];

	var peopleSpans = container.querySelectorAll('span.vN[email]');
	for (var i = 0; i < peopleSpans.length; i++) {
		var obj = {
			emailAddress: peopleSpans[i].getAttribute('email')
		};

		if (peopleSpans[i].innerText !== obj.emailAddress) {
			obj.name = peopleSpans[i].innerText;
		}
		people.push(obj);
	}

	return people;
}
