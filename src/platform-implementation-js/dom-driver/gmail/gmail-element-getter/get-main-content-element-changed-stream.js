import _ from 'lodash';
import Bacon from 'baconjs';

import streamWaitFor from '../../../lib/stream-wait-for';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';

export default function getMainContentElementChangedStream(GmailElementGetter) {
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
							.toProperty({
								target: el
							})
							.filter(_isNowVisible)
							.map('.target')
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
