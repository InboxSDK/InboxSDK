/* @flow */

import once from 'lodash/once';
import Kefir from 'kefir';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';

const waitForGmailModeToSettle = once(() =>
	makeMutationObserverChunkedStream(
		(document.body:any), {attributes: true, attributeFilter: ['class']}
	)
		.toProperty(() => undefined)
		.filter(() => ((document.body:any):HTMLElement).classList.length > 0)
		.map(() => undefined)
		.take(1)
		.toProperty()
);

export default waitForGmailModeToSettle;
