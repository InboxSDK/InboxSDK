/* @flow */

import type GmailComposeView from '../gmail-compose-view';

export default function(gmailComposeView: GmailComposeView) {
	gmailComposeView.getBodyElement().focus();

	const lastSelectionRange = gmailComposeView.getLastSelectionRange();
	const selection = document.getSelection();
	if (!selection) throw new Error();
	if (
		lastSelectionRange &&
		selection.anchorNode === selection.focusNode &&
		selection.anchorOffset === selection.focusOffset
	) {
		selection.removeAllRanges();
		selection.addRange(lastSelectionRange);
	}
}
