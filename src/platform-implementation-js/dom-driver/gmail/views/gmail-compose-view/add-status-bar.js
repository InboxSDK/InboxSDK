/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Kefir = require('kefir');

import Logger from '../../../../lib/logger';
import SafeEventEmitter from '../../../../lib/safe-event-emitter';
import type GmailComposeView from '../gmail-compose-view';

export default function addStatusBar(gmailComposeView: GmailComposeView, options: Object) {
	var height: number = options.height || 40;
	var orderHint: number = options.orderHint || 0;

	var composeEl = gmailComposeView.getElement();
	var isInline = gmailComposeView.isInlineReplyForm();
	var el: HTMLElement = document.createElement('div');
	el.className = 'aDh inboxsdk__compose_statusbar';
	el.setAttribute('data-orderhint', String(orderHint));
	el.style.height = height+'px';

	try {
		var statusArea = gmailComposeView.getStatusArea();
		composeEl.classList.add('inboxsdk__compose_statusbarActive');
		var nextEl = _.chain(statusArea.children)
			.filter(el => el.classList.contains('inboxsdk__compose_statusbar'))
			.map(el => ({el, orderHint: +el.getAttribute('data-orderhint')}))
			.filter(bar => bar.orderHint > orderHint)
			.sortBy(bar => bar.orderHint)
			.map(bar => bar.el)
			.first()
			.value();
		statusArea.insertBefore(el, nextEl);

		if (isInline) {
			var currentPad = parseInt(composeEl.style.paddingBottom, 10) || 0;
			composeEl.style.paddingBottom = (currentPad+height)+'px';
		}
	} catch (err) {
		Logger.error(err);
	}

	var statusbar = _.assign(new SafeEventEmitter(), {
		el,
		destroyed: false,
		destroy: _.once(() => {
			statusbar.destroyed = true;
			statusbar.emit('destroy');
			(el:any).remove();

			if (isInline) {
				var currentPad = parseInt(composeEl.style.paddingBottom, 10) || 0;
				composeEl.style.paddingBottom = (currentPad-height)+'px';
			}
		})
	});
	gmailComposeView.getStopper()
		.takeUntilBy(Kefir.fromEvents(statusbar, 'destroy'))
		.onValue(statusbar.destroy);
	return statusbar;
}
