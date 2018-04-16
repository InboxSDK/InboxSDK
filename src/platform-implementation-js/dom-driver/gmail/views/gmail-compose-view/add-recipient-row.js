/* @flow */

import Kefir from 'kefir';

import blockAndReemiteKeyboardEvents from '../../../../lib/dom/block-and-reemit-keyboard-events';

import type GmailComposeView from '../gmail-compose-view';

export default function addRecipientRow(gmailComposeView: GmailComposeView, recipientRowOptionStream: Kefir.Observable<?Object>): ()=>void {
	let row;

	recipientRowOptionStream
		.takeUntilBy(gmailComposeView.getStopper())
		.onValue((options) => {
			if(row){
				row.remove();
				row = null;
			}

			if(options) {
				row = _createRecipientRowElement(gmailComposeView, options);
				blockAndReemiteKeyboardEvents(row);
			}
			gmailComposeView.getElement().dispatchEvent(new CustomEvent('resize', {
				bubbles: false, cancelable: false, detail: null
			}));
		});

	return () => {
		if (row) {
			row.remove();
			row = null;
			gmailComposeView.getElement().dispatchEvent(new CustomEvent('resize', {
				bubbles: false, cancelable: false, detail: null
			}));
		}
	};
}

function _createRecipientRowElement(gmailComposeView: GmailComposeView, options: Object): HTMLElement {
	var row = document.createElement('tr');
	var labelTD = document.createElement('td');
	var contentTD = document.createElement('td');

	row.appendChild(labelTD);
	row.appendChild(contentTD);

	row.setAttribute('class', 'inboxsdk__recipient_row');

	if(options.labelText){
		labelTD.setAttribute('class', 'ok');

		var span = document.createElement('span');
		span.setAttribute('class', 'gO');

		labelTD.appendChild(span);
		span.textContent = options.labelText;

		if(options.labelClass){
			labelTD.classList.add(options.labelClass);
		}

		if(options.labelTextClass){
			span.classList.add(options.labelTextClass);
		}
	}

	if(options.el){
		contentTD.setAttribute('class', 'az3');
		contentTD.appendChild(options.el);
	}

	var firstRowElement = gmailComposeView.getRecipientRowElements()[0];
	var parent: HTMLElement = (firstRowElement.parentElement:any);
	parent.insertBefore(row, firstRowElement.nextSibling);

	return row;
}
