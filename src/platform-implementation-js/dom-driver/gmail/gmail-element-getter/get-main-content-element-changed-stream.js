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
							.doAction(event => {
									// temporary
									const Logger = require('../../../lib/logger');
									const setupRouteViewDriverStream = require('../gmail-driver/setup-route-view-driver-stream');
									if (setupRouteViewDriverStream.routeViewIsChanging) {
									Logger.error(new Error("Re-entrance madness at a place!"), {
										keys: Object.keys(event),
										attributeName: event.attributeName,
										style: event.target.getAttribute('style'),
										hash: document.location.hash
									});
								}
							})
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
