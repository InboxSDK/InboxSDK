/* @flow */
//jshint ignore:start

const _ = require('lodash');
const Bacon = require('baconjs');
const Kefir = require('kefir');
const kefirCast = require('kefir-cast');
import {defn} from 'ud';
import GmailElementGetter from '../gmail-element-getter';
import kefirFromEventTargetCapture from '../../../lib/kefir-from-event-target-capture';
import kefirMakeMutationObserverChunkedStream from '../../../lib/dom/kefir-make-mutation-observer-chunked-stream';
import onMouseDownAndUp from '../../../lib/dom/on-mouse-down-and-up';
import type GmailDriver from '../gmail-driver';
import type GmailRouteView from '../views/gmail-route-view/gmail-route-view';
import type GmailRouteProcessor from '../views/gmail-route-view/gmail-route-processor';

export default function overrideGmailBackButton(gmailDriver: GmailDriver, gmailRouteProcessor: GmailRouteProcessor){
	GmailElementGetter.waitForGmailModeToSettle().then(function(){
		if(GmailElementGetter.isStandalone()){
			return;
		}
		_setupManagement(gmailDriver, gmailRouteProcessor);
	});
}

function _setupManagement(gmailDriver, gmailRouteProcessor){
	kefirCast(Kefir, gmailDriver.getRouteViewDriverStream())
		.scan((prev: ?{gmailRouteView: GmailRouteView}, gmailRouteView: GmailRouteView) => {
			let lastCustomRouteID, lastCustomRouteParams;
			if (prev && prev.gmailRouteView.isCustomRouteBelongingToApp()) {
				lastCustomRouteID = prev.gmailRouteView.getRouteID();
				lastCustomRouteParams = prev.gmailRouteView.getParams();
			}
			return {gmailRouteView, lastCustomRouteID, lastCustomRouteParams};
		}, null)
		.changes()
		.onValue(({gmailRouteView, lastCustomRouteID, lastCustomRouteParams}) => {
			handleGmailRouteView(
				gmailRouteView, lastCustomRouteID, lastCustomRouteParams,
				gmailDriver, gmailRouteProcessor
			);
		});
}

const handleGmailRouteView = defn(module, function handleGmailRouteView(
	gmailRouteView: GmailRouteView,
	lastCustomRouteID: ?string, lastCustomRouteParams: ?Object,
	gmailDriver: GmailDriver,
	gmailRouteProcessor: GmailRouteProcessor
) {
	if(
		lastCustomRouteID &&
		gmailRouteView.getRouteType() === gmailRouteProcessor.RouteTypes.THREAD
	){
		_bindToBackButton(gmailDriver, gmailRouteView, lastCustomRouteID, lastCustomRouteParams);
	}
});

function _bindToBackButton(gmailDriver: GmailDriver, gmailRouteView: GmailRouteView, routeID: string, routeParams: ?Object){
	const backButton = GmailElementGetter.getThreadBackButton();

	if(!backButton){
		return;
	}

	onMouseDownAndUp(backButton)
		.takeUntilBy(gmailRouteView.getStopper())
		.filter(e => !e.defaultPrevented)
		.onValue(e => {
			gmailDriver.goto(routeID, routeParams);
			e.preventDefault();
			e.stopImmediatePropagation();
		});
}
