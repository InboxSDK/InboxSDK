var $ = require('jquery');

function getAdditionalActionToolbar(gmailComposeView){
	if (!gmailComposeView._additionalAreas.actionToolbar) {
		gmailComposeView._additionalAreas.actionToolbar = _addActionToolbar(gmailComposeView);
	}

	return gmailComposeView._additionalAreas.actionToolbar;
}

function _addActionToolbar(gmailComposeView){
	var td = $(document.createElement('td'));
	td[0].setAttribute('class', 'inboxsdk__compose_actionToolbar gU');
	gmailComposeView.getFormattingArea().before(td);

	var separator = document.createElement('td');
	separator.setAttribute('class', 'inboxsdk__compose_separator gU');
	separator.innerHTML = '<div class="Uz"></div>';

	td.after(separator);

	td.closest('table').find('colgroup col').first()
		.after('<col class="inboxsdk__compose_actionToolbarColumn"></col><col class="inboxsdk__compose_separatorColumn"></col>');

	return $("<div/>").appendTo(td);
}

module.exports = getAdditionalActionToolbar;
