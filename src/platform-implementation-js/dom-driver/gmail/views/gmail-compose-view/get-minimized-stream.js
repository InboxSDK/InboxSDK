/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import kmakeMutationObserverStream from '../../../../lib/dom/kefir-make-mutation-observer-stream';
import type GmailComposeView from '../gmail-compose-view';

const fnStream = udKefir(module, getMinimizedStream_);

export default function getMinimizedStream(gmailComposeView: GmailComposeView): Kefir.Stream<boolean> {
	return fnStream.flatMapLatest(fn => fn(gmailComposeView));
}

function getMinimizedStream_(gmailComposeView: GmailComposeView): Kefir.Stream<boolean> {
	const element = gmailComposeView.getElement();
	const bodyElement = gmailComposeView.getBodyElement();
	const bodyContainer = _.find(element.children, child => child.contains(bodyElement));

	return kmakeMutationObserverStream(bodyContainer, {attributes: true, attributeFilter: ['style']})
		.toProperty()
		.map(() => bodyContainer.style.display !== '');
}
