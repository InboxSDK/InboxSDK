'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var waitFor = require('../../../lib/wait-for');

var GmailElementGetter = require('../gmail-element-getter');

var GmailRouteView = require('../views/gmail-route-view/gmail-route-view');

var getURLObject = require('./get-url-object');

var currentUrlObject = {};
var currentMainElement = null;

function setupRouteViewDriverStream(GmailRouteProcessor){
	return Bacon.mergeAll(

				//if we're to or from a custom view then push to the routeViewDriverStream right away
				Bacon.fromEventTarget(window, 'hashchange')
						.map('.newURL')
						.map(getURLObject)
						.filter(_shouldHandleHashChange(GmailRouteProcessor)),


				//when native gmail changes main view there's a div that takes on role=main
				GmailElementGetter
						.getMainContentElementChangedStream()
						.map(null)
			)
			.map(_createRouteViewDriver, GmailRouteProcessor);

}

function _shouldHandleHashChange(GmailRouteProcessor){
	return function(urlObject){
		return  !GmailElementGetter.isStandalone() &&
				!GmailRouteProcessor.isNativeRoute(urlObject.name) ||
				!GmailRouteProcessor.isNativeRoute(currentUrlObject.name) ||
				GmailRouteProcessor.isContactRouteName(urlObject.name);
	};
}


function _createRouteViewDriver(GmailRouteProcessor, urlObject){
	urlObject = urlObject || getURLObject(location.href);

	currentUrlObject = urlObject;
	var options = _.clone(urlObject);
	options.isCustomRoute = !GmailRouteProcessor.isNativeRoute(urlObject.name) && !GmailElementGetter.isStandalone();

	if(options.isCustomRoute){
		options.params.unshift(options.name);
	}

	return new GmailRouteView(options, GmailRouteProcessor);
}

module.exports = setupRouteViewDriverStream;


/**
 *
 * TODO: Split up "role=main" DOM watching and hash change watching.
 *
 * SDK only cares about hash change when the hash goes to a route that the app registered as custom.
 * Otherwise it only responds to route changes when the role=main div changes.
 *
 */
