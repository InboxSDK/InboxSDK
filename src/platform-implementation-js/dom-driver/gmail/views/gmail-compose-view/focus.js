'use strict';

module.exports = function(gmailComposeView){

	let selectionRange = gmailComposeView.getLastSelectionRange();
	gmailComposeView.getBodyElement().focus();

	if(!selectionRange){
		return;
	}

	let selection = document.getSelection();
	selection.removeAllRanges();
	selection.addRange(selectionRange);
};
