/* @flow */

import type GmailComposeView from '../gmail-compose-view';

const updateAreaMap = new WeakMap();

export default function updateInsertMoreAreaLeft(gmailComposeView: GmailComposeView, oldFormattingAreaOffsetLeft: number){
	let willUpdate = updateAreaMap.get(gmailComposeView);
	if(willUpdate) return;

	updateAreaMap.set(gmailComposeView, true);

	window.requestAnimationFrame(() => {
		updateAreaMap.set(gmailComposeView, false);
		if(!gmailComposeView.getInsertMoreArea()) return;
		var newFormattingAreaOffsetLeft = gmailComposeView._getFormattingAreaOffsetLeft(true);
		var insertMoreAreaLeft = parseInt(gmailComposeView.getInsertMoreArea().style.left, 10);
		var diff = newFormattingAreaOffsetLeft - oldFormattingAreaOffsetLeft;
		gmailComposeView.getInsertMoreArea().style.left = (insertMoreAreaLeft + diff) + 'px';
	});

}
