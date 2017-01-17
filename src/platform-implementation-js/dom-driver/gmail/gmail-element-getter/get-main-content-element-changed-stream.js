/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';

import streamWaitFor from '../../../lib/stream-wait-for';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';

import typeof GmailElementGetter from '../gmail-element-getter';

export default function getMainContentElementChangedStream(GmailElementGetter: GmailElementGetter): Kefir.Observable<HTMLElement> {
	const s = waitForMainContentContainer(GmailElementGetter)
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

	// Make sure we always have a subscriber. The function breaks if it loses all
	// subscribers and then re-gains some.
	s.onValue(()=>{});

	return s;
}

function waitForMainContentContainer(GmailElementGetter){
	if (GmailElementGetter.isStandalone()) {
		return Kefir.never();
	}
	return streamWaitFor(() => GmailElementGetter.getMainContentContainer());
}

function _isNowVisible(mutation){
	const el = mutation.target;
	return el.style.display !== 'none';
}
