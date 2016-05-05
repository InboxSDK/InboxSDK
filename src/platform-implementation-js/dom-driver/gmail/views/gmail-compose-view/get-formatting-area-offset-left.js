/* @flow */

import asap from 'asap';

import type GmailComposeView from '../gmail-compose-view';

const leftMap = new WeakMap();

export default function getFormattingAreaOffsetLeft(gmailComposeView: GmailComposeView, forceGet?: boolean): number {
	if(!forceGet){
		let existingValue = leftMap.get(gmailComposeView);
		if(existingValue != null){
			return existingValue;
		}
	}

	const formattingArea = gmailComposeView.getFormattingArea();
	if (!formattingArea) {
		return 0;
	}


	const left = formattingArea.getBoundingClientRect().left;
	leftMap.set(gmailComposeView, left);

	asap(() => leftMap.delete(gmailComposeView));

	return left;
}
