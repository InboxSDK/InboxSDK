/* @flow */

import RSVP from 'rsvp';

import {simulateClick} from '../../../../lib/dom/simulate-mouse-event';
import setValueAndDispatchEvent from '../../../../lib/dom/set-value-and-dispatch-event';

import type GmailComposeView from '../gmail-compose-view';

export default function insertLinkIntoBody(gmailComposeView: GmailComposeView, text: string, href: string): ?HTMLElement {
	return _insertLinkIntoBody(gmailComposeView, text, href);
}

function _insertLinkIntoBody(gmailComposeView, text, href){
	gmailComposeView.focus();

	gmailComposeView.getBodyElement().focus();

	const selection = document.getSelection();
	if(!selection) throw new Error('selection does\'t exist, what?');

	const range = selection.getRangeAt(0);
	const link = document.createElement('a');
	link.href = href;
	range.extractContents();
	range.insertNode(link);
	link.textContent = text;

	selection.selectAllChildren(link);
	selection.collapseToEnd();

	return link;
}
