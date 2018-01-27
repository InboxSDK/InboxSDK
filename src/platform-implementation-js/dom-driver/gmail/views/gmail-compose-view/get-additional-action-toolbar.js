/* @flow */

import type GmailComposeView from '../gmail-compose-view';

const composeViewActionToolbars = new WeakMap();

function getAdditionalActionToolbar(isUsingMaterialUI: boolean, gmailComposeView: GmailComposeView){
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
		const _actionToolbar = actionToolbar = _addActionToolbar(isUsingMaterialUI, gmailComposeView);
		gmailComposeView.getStopper().onValue(() => {
			_actionToolbar.remove();
		});
		composeViewActionToolbars.set(gmailComposeView, actionToolbar);
	}
	return actionToolbar;
}

function _addActionToolbar(isUsingMaterialUI: boolean, gmailComposeView: GmailComposeView){
	const td = document.createElement('td');
	td.setAttribute('class', 'inboxsdk__compose_actionToolbar gU');
	const formattingArea = gmailComposeView.getFormattingArea();
	if (!formattingArea) throw new Error('formatting area missing');
	formattingArea.insertAdjacentElement('beforebegin', td);

	if(!isUsingMaterialUI){
		const separator = document.createElement('td');
		separator.setAttribute('class', 'inboxsdk__compose_separator gU');
		separator.innerHTML = '<div class="Uz"></div>';

		td.insertAdjacentElement('afterend', separator);
	}
	
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
