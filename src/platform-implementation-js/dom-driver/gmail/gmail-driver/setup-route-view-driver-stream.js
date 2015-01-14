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
	// TODO return a stream that handles unsubscription instead of a bus
	var routeViewDriverStream = new Bacon.Bus();

	var hashChangeStream = Bacon.fromEventTarget(window, 'hashchange').map('.newURL').map(getURLObject);

	//if we're to or from a custom view then push to the routeViewDriverStream right away
	hashChangeStream.filter(_shouldHandleHashChange(GmailRouteProcessor)).onValue(_createRouteViewDriver.bind(null, routeViewDriverStream, GmailRouteProcessor));

	//when native gmail changes main view there's a div that takes on role=main
	GmailElementGetter.getMainContentElementChangedStream().map(null).onValue(_createRouteViewDriver.bind(null, routeViewDriverStream, GmailRouteProcessor));

	return routeViewDriverStream;
}

function _shouldHandleHashChange(GmailRouteProcessor){
	return function(urlObject){
		return (!GmailRouteProcessor.isNativeRoute(urlObject.name) || !GmailRouteProcessor.isNativeRoute(currentUrlObject.name)) ||
			   GmailRouteProcessor.isContactRouteName(urlObject.name);
	};
}


function _createRouteViewDriver(routeViewDriverStream, GmailRouteProcessor, urlObject){
	urlObject = urlObject || getURLObject(location.href);

	currentUrlObject = urlObject;
	var options = _.clone(urlObject);
	options.isCustomRoute = !GmailRouteProcessor.isNativeRoute(urlObject.name);

	if(options.isCustomRoute){
		options.params.unshift(options.name);
	}

	var routeViewDriver = new GmailRouteView(options, GmailRouteProcessor);
	routeViewDriverStream.push(routeViewDriver);
}

module.exports = setupRouteViewDriverStream;
