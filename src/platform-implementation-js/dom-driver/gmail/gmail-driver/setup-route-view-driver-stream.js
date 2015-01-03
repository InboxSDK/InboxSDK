'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var waitFor = require('../../../lib/wait-for');

var GmailElementGetter = require('../gmail-element-getter');

var GmailRouteView = require('../views/gmail-route-view/gmail-route-view');

var getURLObject = require('./get-url-object');

var currentUrlObject = {};
var currentMainElement = null;

function setupRouteViewDriverStream(GmailRouteInfo){
	// TODO return a stream that handles unsubscription instead of a bus
	var routeViewDriverStream = new Bacon.Bus();

	var hashChangeStream = Bacon.fromEventTarget(window, 'hashchange').map('.newURL').map(getURLObject);

	//if we're to or from a custom view then push to the routeViewDriverStream right away
	hashChangeStream.filter(_isNotNativeToNative(GmailRouteInfo)).onValue(_createRouteViewDriver.bind(null, routeViewDriverStream, GmailRouteInfo));
	GmailElementGetter.getMainContentElementChangedStream().map(null).onValue(_createRouteViewDriver.bind(null, routeViewDriverStream, GmailRouteInfo));


	//var nativeToNativeHashChangeStream = hashChangeStream.filter(_isNativeToNative(GmailRouteInfo));


	return routeViewDriverStream;
}

function _isNativeToNative(GmailRouteInfo){
	return function(urlObject){
		return GmailRouteInfo.isNativeRoute(urlObject.name) && GmailRouteInfo.isNativeRoute(currentUrlObject.name);
	};
}

function _isNotNativeToNative(GmailRouteInfo){
	return function(urlObject){
		return !GmailRouteInfo.isNativeRoute(urlObject.name) || !GmailRouteInfo.isNativeRoute(currentUrlObject.name);
	};
}


function _handleNewUrl(routeViewDriverStream, GmailRouteInfo, newUrl){
	var urlObject = getURLObject(newUrl);


	if(_isThreadRoute(GmailRouteInfo, urlObject)){
		_createThreadRouteViewDriver(routeViewDriverStream, GmailRouteInfo, urlObject);
		return;
	}

	_createRouteViewDriver(routeViewDriverStream, GmailRouteInfo, urlObject);
}

function _isThreadRoute(GmailRouteInfo, urlObject){
	return  GmailRouteInfo.isNativeRoute(urlObject.name) &&
			GmailRouteInfo.isListRouteName(urlObject.name) &&
		    (GmailElementGetter.getRowListElements().length === 0 || _doesUrlContainThreadId(urlObject));
}

function _doesUrlContainThreadId(urlObject){
	if(urlObject.params.length === 0){
		return false;
	}

	var potentialThreadId = _.last(urlObject.params);
	if(potentialThreadId.length !== 16){
		return false;
	}

	return !!potentialThreadId.toLowerCase().match(/^[0-9a-f]+$/); //only contains base16 chars
}

function _createThreadRouteViewDriver(routeViewDriverStream, GmailRouteInfo, urlObject){
	waitFor(function(){
		var urlHash = location.hash;
		if(urlHash){
			urlHash = urlHash.substring(1);
			if(urlHash.split('?')[0] !== urlObject.hash){
				throw new Error('no longer loading a thread');
			}
		}

		return !!GmailElementGetter.getThreadContainerElement();

	}, 30*1000, 50).then(function(){
		_createRouteViewDriver(routeViewDriverStream, GmailRouteInfo, urlObject);
	}, function(err){
		if(err !== 'no longer loading a thread'){
			throw err;
		}
	});
}


function _createRouteViewDriver(routeViewDriverStream, GmailRouteInfo, urlObject){
	urlObject = urlObject || getURLObject(location.href);

	currentUrlObject = urlObject;
	var options = _.clone(urlObject);
	options.isCustomRoute = !GmailRouteInfo.isNativeRoute(urlObject.name);

	if(options.isCustomRoute){
		options.params.unshift(options.name);
	}

	var routeViewDriver = new GmailRouteView(options, GmailRouteInfo);
	routeViewDriverStream.push(routeViewDriver);
}

module.exports = setupRouteViewDriverStream;
