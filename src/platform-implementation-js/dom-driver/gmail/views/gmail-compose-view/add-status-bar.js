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

	try {
		const statusArea = gmailComposeView.getStatusArea();
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
	} catch (err) {
		Logger.error(err);
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


/**
 * @class
 * Object that represents a status bar at the bootom of a compose view.
 */
var StatusBarView = /** @lends StatusBarView */{
	/**
	 * The status bar HTML element that you should fill with your apps content
	 * @type {HTMLElement}
	 */
	el: null,

	/**
	* destroys the status bar
	* @return {void}
	*/
	destroy: function() {}

	/**
	 * Fires when the status bar is destroyed. This can be triggered by the .destroy method, or if
	 * the ComposeView is destroyed.
	 * @event StatusBarView#destroy
	 */
};


/**
 * @class
 * This type is passed into the {ComposeView.addStatusBar()} method as a way to configure the status bar shown.
 */
var StatusBarDescriptor = /** @lends StatusBarDescriptor */{
	/**
	 * The vertical height of the status bar in pixels
	 * ^optional
	 * ^default=40
	 * @type {Number}
	 */
	height: null,

	/**
	 * The order in which to show the status bars.
	 * ^optional
	 * ^default=0
	 * @type {Number}
	 */
	orderHint:null
};
