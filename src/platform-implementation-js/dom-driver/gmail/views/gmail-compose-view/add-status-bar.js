import _ from 'lodash';
import Bacon from 'baconjs';

import SafeEventEmitter from '../../../../lib/safe-event-emitter';

export default function addStatusBar(gmailComposeView) {
	const el = document.createElement('div');
	el.className = 'aDh inboxsdk__compose_statusbar';

	gmailComposeView.getElement().querySelector('.aDg .aDj > .aDh').appendChild(el);
	gmailComposeView.getElement().classList.add('inboxsdk__compose_statusbarActive');

	const statusbar = _.assign(new SafeEventEmitter(), {
		el,
		destroy: _.once(() => {
			statusbar.emit('destroy');
			el.remove();
		})
	});
	gmailComposeView.getEventStream().filter(false).mapEnd()
		.takeUntil(Bacon.fromEvent(statusbar, 'destroy'))
		.onValue(statusbar.destroy);
	return statusbar;
}
