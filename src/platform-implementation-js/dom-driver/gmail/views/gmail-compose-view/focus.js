'use strict';

export default function(gmailComposeView) {
	gmailComposeView.getBodyElement().focus();

	const lastSelectionRange = gmailComposeView.getLastSelectionRange();
	const selection = document.getSelection();
	if (
		lastSelectionRange &&
		selection.anchorNode === selection.focusNode &&
		selection.anchorOffset === selection.focusOffset
	) {
		selection.removeAllRanges();
		selection.addRange(lastSelectionRange);
	}
}
