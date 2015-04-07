var _ = require('lodash');
var Bacon = require('baconjs');

var streamWaitFor = require('../../../lib/stream-wait-for');
var makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');

import makeElementChildStream from '../../../lib/dom/make-element-child-stream';

export default function getMainContentElementChangedStream(GmailElementGetter) {
	return waitForMainContentContainer(GmailElementGetter)
				.flatMap(mainContentContainer =>
					makeElementChildStream(mainContentContainer)
						.map(({el}) => el)
						.filter(el => el.classList.contains('nH'))
						.flatMap(el =>
							makeMutationObserverStream(el, {
								attributes: true,
								attributeFilter: ['style']
							})
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
