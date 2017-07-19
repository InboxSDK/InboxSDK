/* @flow */

import type GmailComposeView from '../gmail-compose-view';

const updateAreaSet = new WeakSet();

export default function updateInsertMoreAreaLeft(gmailComposeView: GmailComposeView, oldFormattingAreaOffsetLeft: number){
	if(updateAreaSet.has(gmailComposeView)) return;

	updateAreaSet.add(gmailComposeView);

	window.requestAnimationFrame(() => {
		updateAreaSet.delete(gmailComposeView);
		if(gmailComposeView.isDestroyed()) return;
		var newFormattingAreaOffsetLeft = gmailComposeView._getFormattingAreaOffsetLeft();
		var insertMoreAreaLeft = parseInt(gmailComposeView.getInsertMoreArea().style.left, 10);
		var diff = newFormattingAreaOffsetLeft - oldFormattingAreaOffsetLeft;
		gmailComposeView.getInsertMoreArea().style.left = (insertMoreAreaLeft + diff) + 'px';
	});

}
