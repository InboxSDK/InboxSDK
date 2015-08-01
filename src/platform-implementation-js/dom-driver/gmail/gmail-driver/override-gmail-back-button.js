/* @flow */
//jshint ignore:start

import _ from 'lodash';
import * as Bacon from 'baconjs';
import * as Kefir from 'kefir';
import GmailElementGetter from '../gmail-element-getter';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import kefirMakeMutationObserverChunkedStream from '../../../lib/dom/kefir-make-mutation-observer-chunked-stream';
import type GmailDriver from '../gmail-driver';
import type GmailRouteView from '../views/gmail-route-view/gmail-route-view';
import type GmailRouteProcessor from '../views/gmail-route-view/gmail-route-processor';

export default function overrideGmailBackButton(gmailDriver: GmailDriver, gmailRouteProcessor: GmailRouteProcessor){
	GmailElementGetter.waitForGmailModeToSettle().then(function(){
		if(GmailElementGetter.isStandalone()){
			return;
		}

		// If another driver has claimed it, then wait for that driver to unclaim it
		// first.
		waitToClaim()
			.takeUntilBy(gmailDriver.getStopper())
			.onValue(() => {
				_setupManagement(gmailDriver, gmailRouteProcessor);
				_claim();
				gmailDriver.getStopper().onValue(_unclaim);
			});
	});
}


function _setupManagement(gmailDriver, gmailRouteProcessor){

	var lastCustomRouteID = null;
	var lastCustomRouteParams = null;


	gmailDriver.getRouteViewDriverStream()
		.onValue(gmailRouteView => {
			if(gmailRouteView.getType() === 'CUSTOM'){
				lastCustomRouteID = gmailRouteView.getRouteID();
				lastCustomRouteParams = gmailRouteView.getParams();
			}
			else {

				if(lastCustomRouteID){
					if(gmailRouteView.getRouteType() === gmailRouteProcessor.RouteTypes.THREAD){
						_bindToBackButton(gmailDriver, gmailRouteView, lastCustomRouteID, lastCustomRouteParams);
					}
				}

				lastCustomRouteID = null;
				lastCustomRouteParams = null;
			}

		});
}

function waitToClaim(): Kefir.Stream {
	return Kefir.later(0).merge(
			kefirMakeMutationObserverChunkedStream(document.body, {attributes: true, attributeFilter: ['data-back-button-state-managed']})
		)
		.map(() => document.body.getAttribute('data-back-button-state-managed') !== 'true')
		.filter(Boolean)
		.take(1);
}

function _claim(){
	document.body.setAttribute('data-back-button-state-managed', 'true');
}
function _unclaim(){
	document.body.removeAttribute('data-back-button-state-managed');
}

function _bindToBackButton(gmailDriver: GmailDriver, gmailRouteView: GmailRouteView, routeID: string, routeParams: ?Object){
	var backButton = GmailElementGetter.getThreadBackButton();

	if(!backButton){
		return;
	}

	fromEventTargetCapture(backButton, 'mousedown')
	.takeUntil(gmailRouteView.getEventStream().filter(false).mapEnd())
	.onValue(e => {
		gmailDriver.goto(routeID, routeParams);
		e.preventDefault();
		e.stopImmediatePropagation();
	});
}
