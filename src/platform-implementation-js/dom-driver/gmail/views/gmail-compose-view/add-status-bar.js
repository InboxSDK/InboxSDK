import _ from 'lodash';
import Bacon from 'baconjs';

import Logger from '../../../../lib/logger';
import SafeEventEmitter from '../../../../lib/safe-event-emitter';

export default function addStatusBar(gmailComposeView, options) {
	const height = options.height || 40;
	const orderHint = options.orderHint || 0;

	const composeEl = gmailComposeView.getElement();
	const isInline = gmailComposeView.isInlineReplyForm();
	const el = document.createElement('div');
	el.className = 'aDh inboxsdk__compose_statusbar';
	el.setAttribute('data-orderhint', orderHint);
	el.style.height = height+'px';

	const statusArea = composeEl.querySelector('.aDg .aDj > .aDh');
	if (!statusArea) {
		Logger.error(new Error("Failed to find compose status area"));
	} else {
		composeEl.classList.add('inboxsdk__compose_statusbarActive');
		const nextEl = _.chain(statusArea.children)
			.filter(el => el.classList.contains('inboxsdk__compose_statusbar'))
			.map(el => ({el, orderHint: +el.getAttribute('data-orderhint')}))
			.filter(bar => bar.orderHint > orderHint)
			.sortBy(bar => bar.orderHint)
			.map(bar => bar.el)
			.first()
			.value();
		statusArea.insertBefore(el, nextEl);

		if (isInline) {
			const currentPad = parseInt(composeEl.style.paddingBottom, 10) || 0;
			composeEl.style.paddingBottom = (currentPad+height)+'px';
		}
	}

	const statusbar = _.assign(new SafeEventEmitter(), {
		el,
		destroy: _.once(() => {
			statusbar.emit('destroy');
			el.remove();

			if (isInline) {
				const currentPad = parseInt(composeEl.style.paddingBottom, 10) || 0;
				composeEl.style.paddingBottom = (currentPad-height)+'px';
			}
		})
	});
	gmailComposeView.getEventStream().filter(false).mapEnd()
		.takeUntil(Bacon.fromEvent(statusbar, 'destroy'))
		.onValue(statusbar.destroy);
	return statusbar;
}
