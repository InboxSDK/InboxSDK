/* @flow */

import once from 'lodash/function/once';
import Kefir from 'kefir';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';

const waitForGmailModeToSettle = once(() =>
	makeMutationObserverChunkedStream(
		document.body, {attributes: true, attributeFilter: ['class']}
	)
		.toProperty(() => undefined)
		.filter(() => document.body.classList.length > 0)
		.map(() => undefined)
		.take(1)
		.toProperty()
);

export default waitForGmailModeToSettle;
