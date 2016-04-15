/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';

import streamWaitFor from '../../../lib/stream-wait-for';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';

import type GmailElementGetter from '../gmail-element-getter';

export default function getMainContentElementChangedStream(GmailElementGetter: Object): Kefir.Stream<HTMLElement> {
	return waitForMainContentContainer(GmailElementGetter)
				.flatMap(mainContentContainer =>
					makeElementChildStream(mainContentContainer)
						.map(({el}) => el)
						.filter(el => el.classList.contains('nH'))
						.flatMap(el =>
							makeMutationObserverChunkedStream(el, {
								attributes: true,
								attributeFilter: ['style']
							})
							.map(_.last)
							.toProperty(() => {
								return {target: el};
							})
							.filter(_isNowVisible)
							.map(e => e.target)
						)
				).toProperty();
}

function waitForMainContentContainer(GmailElementGetter){
	return streamWaitFor(() => GmailElementGetter.getMainContentContainer());
}

function _isNowVisible(mutation){
	const el = mutation.target;
	return el.style.display !== 'none';
}
