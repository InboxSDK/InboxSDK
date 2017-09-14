/* @flow */

import once from 'lodash/once';
import Kefir from 'kefir';

import Logger from '../../../../lib/logger';
import SafeEventEmitter from '../../../../lib/safe-event-emitter';
import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';
import type GmailComposeView from '../gmail-compose-view';

export default function addStatusBar(
	gmailComposeView: GmailComposeView,
	options: {height?: number, orderHint?: number, addAboveNativeStatusBar?: boolean}
) {
	const {height, orderHint, addAboveNativeStatusBar} = {
		height: 40,
		orderHint: 0,
		addAboveNativeStatusBar: false,
		...options
	};

	let prependContainer;
	const composeEl = gmailComposeView.getElement();
	const isInline = gmailComposeView.isInlineReplyForm();
	const el = document.createElement('div');
	el.className = 'aDh inboxsdk__compose_statusbar';
	el.setAttribute('data-order-hint', String(orderHint));
	el.style.height = height + 'px';

	try {
		const statusArea = gmailComposeView.getStatusArea();
		composeEl.classList.add('inboxsdk__compose_statusbarActive');

		if (addAboveNativeStatusBar) {
			prependContainer = (
				statusArea.querySelector('.inboxsdk__compose_statusBarPrependContainer') ||
				document.createElement('div')
			);
			prependContainer.classList.add('inboxsdk__compose_statusBarPrependContainer');
			statusArea.insertAdjacentElement('afterbegin', prependContainer);

			insertElementInOrder(prependContainer, el);
		} else {
			insertElementInOrder(statusArea, el);
		}

		if (isInline) {
			const currentPad = parseInt(composeEl.style.paddingBottom, 10) || 0;
			composeEl.style.paddingBottom = (currentPad + height) + 'px';
		}
	} catch (err) {
		Logger.error(err);
	}

	const statusbar = Object.assign((new SafeEventEmitter(): Object), {
		el,
		destroyed: false,
		destroy: once(() => {
			statusbar.destroyed = true;
			statusbar.emit('destroy');
			el.remove();

			if (
				addAboveNativeStatusBar &&
				prependContainer &&
				prependContainer.children.length === 0
			) {
				prependContainer.remove();
			}

			if (isInline) {
				const currentPad = parseInt(composeEl.style.paddingBottom, 10) || 0;
				composeEl.style.paddingBottom = (currentPad - height) + 'px';
			}
		})
	});

	gmailComposeView.getStopper()
		.takeUntilBy(Kefir.fromEvents(statusbar, 'destroy'))
		.onValue(statusbar.destroy);

	return statusbar;
}
