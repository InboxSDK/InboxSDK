import _ from 'lodash';
import Bacon from 'baconjs';

import Logger from '../../../../lib/logger';
import SafeEventEmitter from '../../../../lib/safe-event-emitter';

export default function addStatusBar(gmailComposeView) {
	const composeEl = gmailComposeView.getElement();
	const isInline = gmailComposeView.isInlineReplyForm();
	const el = document.createElement('div');
	el.className = 'aDh inboxsdk__compose_statusbar';

	const statusArea = composeEl.querySelector('.aDg .aDj > .aDh');
	if (!statusArea) {
		Logger.error(new Error("Failed to find compose status area"));
	} else {
		composeEl.classList.add('inboxsdk__compose_statusbarActive');
		statusArea.appendChild(el);

		if (isInline) {
			const currentPad = parseInt(composeEl.style.paddingBottom, 10) || 0;
			composeEl.style.paddingBottom = (currentPad+40)+'px';
		}
	}

	const statusbar = _.assign(new SafeEventEmitter(), {
		el,
		destroy: _.once(() => {
			statusbar.emit('destroy');
			el.remove();

			if (isInline) {
				const currentPad = parseInt(composeEl.style.paddingBottom, 10) || 0;
				composeEl.style.paddingBottom = (currentPad-40)+'px';
			}
		})
	});
	gmailComposeView.getEventStream().filter(false).mapEnd()
		.takeUntil(Bacon.fromEvent(statusbar, 'destroy'))
		.onValue(statusbar.destroy);
	return statusbar;
}
