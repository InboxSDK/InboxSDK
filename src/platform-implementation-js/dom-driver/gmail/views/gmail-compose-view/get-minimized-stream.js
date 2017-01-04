/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import makeMutationObserverStream from '../../../../lib/dom/make-mutation-observer-stream';
import type GmailComposeView from '../gmail-compose-view';

const fnStream = udKefir(module, getMinimizedStream_);

export default function getMinimizedStream(gmailComposeView: GmailComposeView): Kefir.Observable<boolean> {
	return fnStream.flatMapLatest(fn => fn(gmailComposeView));
}

function getMinimizedStream_(gmailComposeView: GmailComposeView): Kefir.Observable<boolean> {
	const element = gmailComposeView.getElement();
	const bodyElement = gmailComposeView.getBodyElement();
	const bodyContainer = _.find(element.children, child => child.contains(bodyElement));

	return makeMutationObserverStream(bodyContainer, {attributes: true, attributeFilter: ['style']})
		.map(() => gmailComposeView.isMinimized());
}
