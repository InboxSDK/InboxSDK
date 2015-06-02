'use strict';

import _ from 'lodash';
import Bacon from 'baconjs';


import GmailElementGetter from '../gmail-element-getter';


export default function overrideGmailBackButton(gmailDriver, gmailRouteProcessor){
	GmailElementGetter.waitForGmailModeToSettle().then(function(){
		if(GmailElementGetter.isStandalone()){
			return;
		}

		if(_isClaimed()){
			return;
		}

		_setupManagement(gmailDriver, gmailRouteProcessor);
		_claim();
	});
}


function _setupManagement(gmailDriver, gmailRouteProcessor){

	let isLastRouteCustom = false;
	let lastCustomRouteID = null;
	let lastCustomRouteParams = null;


	gmailDriver.getRouteViewDriverStream()
		.onValue(gmailRouteView => {
			if(gmailRouteView.getType() === 'CUSTOM'){
				isLastRouteCustom = true;
				lastCustomRouteID = gmailRouteView.getRouteID();
				lastCustomRouteParams = gmailRouteView.getParams();
			}
			else {

				if(isLastRouteCustom){
					if(gmailRouteView.getRouteType() === gmailRouteProcessor.RouteTypes.THREAD){
						_bindToBackButton(gmailDriver, gmailRouteView, lastCustomRouteID, lastCustomRouteParams);
					}
				}

				isLastRouteCustom = false;
				lastCustomRouteID = null;
				lastCustomRouteParams = null;
			}

		});
}

function _isClaimed(){
	return document.body.getAttribute('data-back-button-state-managed') === 'true';
}

function _claim(){
	document.body.setAttribute('data-back-button-state-managed', 'true');
}

function _bindToBackButton(gmailDriver, gmailRouteView, routeID, routeParams){
	let backButton = GmailElementGetter.getThreadBackButton();

	if(!backButton){
		return;
	}

	Bacon.fromBinder(
		sink => {
			backButton.addEventListener('mousedown', sink, true);

			return function(){
				backButton.removeEventListener('mousedown', sink, true);
			};
		}
	)
	.takeUntil(gmailRouteView.getEventStream().filter(false).mapEnd())
	.onValue(e => {
		gmailDriver.goto(routeID, routeParams);
		e.preventDefault();
		e.stopImmediatePropagation();
	});
}
