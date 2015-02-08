'use strict';

const _ = require('lodash');
const Bacon = require('baconjs');
const waitFor = require('../../../lib/wait-for');
const GmailElementGetter = require('../gmail-element-getter');
const GmailRouteView = require('../views/gmail-route-view/gmail-route-view');
const getURLObject = require('./get-url-object');

const Map = require('es6-unweak-collections').Map;

var currentUrlObject = {};

const elementToGmailRouteViewMap = new Map();

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
		return !GmailRouteProcessor.isNativeRoute(urlObject.name) ||
				!GmailRouteProcessor.isNativeRoute(currentUrlObject.name) ||
				GmailRouteProcessor.isContactRouteName(urlObject.name);
	};
}


function _createRouteViewDriver(GmailRouteProcessor, urlObject){
	urlObject = urlObject || getURLObject(location.href);

	currentUrlObject = urlObject;
	var options = _.clone(urlObject);
	options.isCustomRoute = !GmailRouteProcessor.isNativeRoute(urlObject.name);

	if(options.isCustomRoute){
		options.params.unshift(options.name);
		return new GmailRouteView(options, GmailRouteProcessor);
	}
	else{
		const currentMainElement = GmailElementGetter.getCurrentMainContentElement();
		if(elementToGmailRouteViewMap.has(currentMainElement)){
			return elementToGmailRouteViewMap.get(currentMainElement);
		}
		else{
			options.element = currentMainElement;

			const gmailRouteView = new GmailRouteView(options, GmailRouteProcessor);
			_addToMap(currentMainElement, gmailRouteView);
			return gmailRouteView;
		}
	}
}

function _addToMap(element, gmailRouteView){
	elementToGmailRouteViewMap.set(element, gmailRouteView);
	gmailRouteView.getEventStream().onEnd((event) => {
		elementToGmailRouteViewMap.delete(element);
	});
}

module.exports = setupRouteViewDriverStream;
