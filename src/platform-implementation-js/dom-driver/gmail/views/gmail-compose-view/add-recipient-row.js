/* @flow */

import Kefir from 'kefir';
import type GmailComposeView from '../gmail-compose-view';

export default function addRecipientRow(gmailComposeView: GmailComposeView, recipientRowOptionStream: Kefir.Observable<?Object>): ()=>void {
	let row;

	recipientRowOptionStream
		.takeUntilBy(gmailComposeView.getStopper())
		.onValue((options) => {
			if(row){
				(row:any).remove();
				row = null;
			}

			if(options) {
				row = _createRecipientRowElement(gmailComposeView, options);
				_reemitKeyboardEvents(row, gmailComposeView.getStopper());
			}
			gmailComposeView.getElement().dispatchEvent(new CustomEvent('resize', {
				bubbles: false, cancelable: false, detail: null
			}));
		});

	return () => {
		if (row) {
			(row:any).remove();
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

function _reemitKeyboardEvents(rowEl: HTMLElement, stopper: Kefir.Observable<null>) {
	// Gmail stops propagation of keyboard events from escaping
	// a specific compose window, which prevents any React components rendered
	// in the compose window's subtree from getting them (since React adds
	// a single event listener on the document). By stopping propagation of
	// the original event and reemiting it on the document, we preserve
	// exisitng behavior while giving React a chance to hear it.

	Kefir.merge([
		Kefir.fromEvents(rowEl, 'keypress'),
		Kefir.fromEvents(rowEl, 'keydown'),
		Kefir.fromEvents(rowEl, 'keyup')
	]).takeUntilBy(stopper).onValue((event: KeyboardEvent) => {
		event.stopPropagation();

		const fakeEvent = new KeyboardEvent(event.type);
		Object.defineProperties(fakeEvent, {
			cancelable: {value: event.cancelable},
			bubbles: {value: event.bubbles},
			target: {value: event.target},
			detail: {value: event.detail},
			key: {value: event.key},
			code: {value: event.code},
			location: {value: event.location},
			ctrlKey: {value: event.ctrlKey},
			shiftKey: {value: event.shiftKey},
			altKey: {value: event.altKey},
			metaKey: {value: event.metaKey},
			repeat: {value: event.repeat},
			isComposing: {value: event.isComposing},
			charCode: {value: event.charCode},
			keyCode: {value: event.keyCode},
			which: {value: event.which}
		});
		document.dispatchEvent(fakeEvent);
	});
}
