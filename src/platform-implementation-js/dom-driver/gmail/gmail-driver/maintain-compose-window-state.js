/* @flow */
//jshint ignore:start

import _ from 'lodash';
import GmailElementGetter from '../gmail-element-getter';
import * as Bacon from 'baconjs';
import kefirCast from 'kefir-cast';
import * as Kefir from 'kefir';
import kefirMakeMutationObserverChunkedStream from '../../../lib/dom/kefir-make-mutation-observer-chunked-stream';
import type GmailDriver from '../gmail-driver';

export default function maintainComposeWindowState(gmailDriver: GmailDriver){

	GmailElementGetter.waitForGmailModeToSettle().then(function(){
		if(GmailElementGetter.isStandalone()){
			return;
		}

		// If another driver has claimed it, then wait for that driver to unclaim it
		// first.
		waitToClaim()
			.takeUntilBy(gmailDriver.getStopper())
			.onValue(() => {
				_setupManagement(gmailDriver);
				_claim();
				gmailDriver.getStopper().onValue(_unclaim);
			});
	});
}

function _setupManagement(gmailDriver){

	kefirCast(Kefir, gmailDriver.getComposeViewDriverStream())
				.flatMap((gmailComposeView) =>
							kefirCast(Kefir, gmailComposeView.getEventStream())
								.filter(({eventName}) => eventName === 'restored')
								.map(() => gmailComposeView)
				)
				.filterBy(
					Kefir.fromEvents(window, 'hashchange')
								.flatMapLatest(() => Kefir.constant(true).merge(Kefir.later(250, false)))
								.toProperty(() => false)
				)
				.onValue(gmailComposeView => gmailComposeView.minimize());

}

function waitToClaim(): Kefir.Stream {
	return Kefir.later(0).merge(
			kefirMakeMutationObserverChunkedStream(document.body, {attributes: true, attributeFilter: ['data-compose-window-state-managed']})
		)
		.map(() => document.body.getAttribute('data-compose-window-state-managed') !== 'true')
		.filter(Boolean)
		.take(1);
}
function _claim(){
	document.body.setAttribute('data-compose-window-state-managed', 'true');
}
function _unclaim(){
	document.body.removeAttribute('data-compose-window-state-managed');
}
