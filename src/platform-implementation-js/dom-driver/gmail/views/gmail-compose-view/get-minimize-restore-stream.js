/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Kefir = require('kefir');
import udKefir from 'ud-kefir';
import kmakeMutationObserverStream from '../../../../lib/dom/kefir-make-mutation-observer-stream';
import type GmailComposeView from '../gmail-compose-view';

var fnStream = udKefir(module, getMinimizeRestoreStream_);

export default function getMinimizeRestoreStream(gmailComposeView: GmailComposeView): Kefir.Stream {
	return fnStream.flatMapLatest(fn => fn(gmailComposeView));
}

function getMinimizeRestoreStream_(gmailComposeView: GmailComposeView): Kefir.Stream {
	var element = gmailComposeView.getElement();
	var bodyElement = gmailComposeView.getBodyElement();
	var bodyContainer = _.find(element.children, child => child.contains(bodyElement));

	return kmakeMutationObserverStream(bodyContainer, {attributes: true, attributeFilter: ['style']})
		.map(() => bodyContainer.style.display !== '')
		.map(
			(isMinimized) => isMinimized ?
				{eventName: 'minimized'} :
				{eventName: 'restored'}
		);
}
