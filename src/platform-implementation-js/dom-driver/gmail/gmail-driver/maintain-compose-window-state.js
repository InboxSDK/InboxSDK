/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Kefir = require('kefir');
var ud = require('ud');
var udKefir = require('ud-kefir');
import GmailElementGetter from '../gmail-element-getter';
import kefirCast from 'kefir-cast';
import kefirMakeMutationObserverChunkedStream from '../../../lib/dom/kefir-make-mutation-observer-chunked-stream';
import type GmailDriver from '../gmail-driver';
import type GmailComposeView from '../views/gmail-compose-view';

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

function getWorkStream(gmailDriver: GmailDriver): Kefir.Stream<()=>void> {
	return (kefirCast(Kefir, gmailDriver.getComposeViewDriverStream()): Kefir.Stream<GmailComposeView>)
		.flatMap((gmailComposeView: GmailComposeView) =>
			gmailComposeView.getEventStream()
				.filter(({eventName}) => eventName === 'restored')
				.map(() => gmailComposeView)
		)
		.filterBy(
			Kefir.fromEvents(window, 'hashchange')
				.flatMapLatest(() => Kefir.constant(true).merge(Kefir.later(250, false)))
				.toProperty(() => false)
		)
		.map(gmailComposeView => {
			console.log('got restore from compose', gmailComposeView.getElement());
			return () => {
				gmailComposeView.minimize();
			};
		})
}

var fnStream = udKefir(module, getWorkStream);

function _setupManagement(gmailDriver: GmailDriver) {
	fnStream
		.flatMapLatest(fn => fn(gmailDriver))
		.onValue(work => work());
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
