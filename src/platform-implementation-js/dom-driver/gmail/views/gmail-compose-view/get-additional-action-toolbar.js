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
	var td = document.createElement('td');
	td.setAttribute('class', 'inboxsdk__compose_actionToolbar gU');
	gmailComposeView.getFormattingArea().insertAdjacentElement('beforebegin', td);

	var separator = document.createElement('td');
	separator.setAttribute('class', 'inboxsdk__compose_separator gU');
	separator.innerHTML = '<div class="Uz"></div>';

	td.insertAdjacentElement('afterend', separator);

	let parent = td.parentElement;
	while(parent){
		if(parent.tagName === 'TABLE') break;
		parent = parent.parentElement;
	}

	if(parent){
		const col = parent.querySelector('colgroup col');
		if(col){
			const newCol1 = document.createElement('col');
			newCol1.setAttribute('class', 'inboxsdk__compose_actionToolbarColumn');
			const newCol2 = document.createElement('col');
			newCol2.setAttribute('class', 'inboxsdk__compose_separatorColumn');

			// want to make it <col><newCol1><newCol2> so insert in reverse order
			col.insertAdjacentElement('afterend', newCol2);
			col.insertAdjacentElement('afterend', newCol1);
		}
	}

	var toolbarDiv = document.createElement('div');
	td.appendChild(toolbarDiv);

	return toolbarDiv;
}

module.exports = getAdditionalActionToolbar;
