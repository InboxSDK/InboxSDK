import $ from 'jquery';

const composeViewActionToolbars = new WeakMap();

function getAdditionalActionToolbar(gmailComposeView){
	var groupedActionToolbar = gmailComposeView.getElement().querySelector('.inboxsdk__compose_groupedActionToolbar > div');
	if(groupedActionToolbar){
		return groupedActionToolbar;
	}

	let actionToolbar = gmailComposeView.getElement().querySelector('.inboxsdk__compose_actionToolbar > div');
	if(actionToolbar){
		return actionToolbar;
	}

	actionToolbar = composeViewActionToolbars.get(gmailComposeView);
	if (!actionToolbar) {
		actionToolbar = _addActionToolbar(gmailComposeView);
		gmailComposeView.getStopper().onValue(() => {
			actionToolbar.remove();
		});
		composeViewActionToolbars.set(gmailComposeView, actionToolbar);
	}
	return actionToolbar;
}

function _addActionToolbar(gmailComposeView){
	var td = $(document.createElement('td'));
	td[0].setAttribute('class', 'inboxsdk__compose_actionToolbar gU');
	$(gmailComposeView.getFormattingArea()).before(td);

	var separator = document.createElement('td');
	separator.setAttribute('class', 'inboxsdk__compose_separator gU');
	separator.innerHTML = '<div class="Uz"></div>';

	td.after(separator);

	td.closest('table').find('colgroup col').first()
		.after('<col class="inboxsdk__compose_actionToolbarColumn"></col><col class="inboxsdk__compose_separatorColumn"></col>');

	var toolbarDiv = document.createElement('div');
	td.append(toolbarDiv);

	return toolbarDiv;
}

module.exports = getAdditionalActionToolbar;
