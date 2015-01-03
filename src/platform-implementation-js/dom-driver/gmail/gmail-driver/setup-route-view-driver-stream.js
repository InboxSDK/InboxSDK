'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var waitFor = require('../../../lib/wait-for');

var GmailElementGetter = require('../gmail-element-getter');

var GmailRouteView = require('../views/gmail-route-view/gmail-route-view');

var getURLObject = require('./get-url-object');

var currentUrlObject = {};

function setupRouteViewDriverStream(GmailRouteInfo){
	// TODO return a stream that handles unsubscription instead of a bus
	var routeViewDriverStream = new Bacon.Bus();

	var hashChangeStream = Bacon.fromEventTarget(window, 'hashchange');
	var nativeToNativeHashChangeStream = hashChangeStream.filter(_isNativeToNative);


	window.addEventListener('hashchange', function(event){
		_checkForCustomRoute(routeViewDriverStream, GmailRouteInfo, event);
	});

	waitFor(function(){
		return !!GmailElementGetter.getMainContentContainer();
	}).then(function(){
		_handleNewUrl(routeViewDriverStream, GmailRouteInfo, location.href);

		var mainContentContainer = GmailElementGetter.getMainContentContainer();

		var mainContentObserver = new MutationObserver(function(mutations){
			if(mutations[0].removedNodes.length > 0){
				return;
			}


			var shouldHandleNewUrl = false;
			mutations.forEach(function(mutation){
				Array.prototype.forEach.call(mutation.addedNodes, function(element){
					if(!element.classList.contains('nH')){
						return;
					}

					shouldHandleNewUrl = true;
					_observeVisibilityChangeOnMainElement(routeViewDriverStream, GmailRouteInfo, element);
				});
			});

			if(shouldHandleNewUrl){
				_handleNewUrl(routeViewDriverStream, GmailRouteInfo, location.href);
			}
		});

		mainContentObserver.observe(
			mainContentContainer,
			{childList: true}
		);

		_observeVisibilityChangeOnMainElement(routeViewDriverStream, GmailRouteInfo, GmailElementGetter.getCurrentMainContentElement());
	});

	return routeViewDriverStream.debounceImmediate(20);
}

function _checkForCustomRoute(routeViewDriverStream, GmailRouteInfo, event){
	var urlObject = getURLObject(event.newURL);
	if(currentUrlObject.hash === urlObject.hash){
		return;
	}

	if(GmailRouteInfo.isNativeRoute(urlObject.name) && GmailRouteInfo.isNativeRoute(currentUrlObject.name)){
		return;
	}

	currentUrlObject = urlObject;
	_createRouteViewDriver(routeViewDriverStream, GmailRouteInfo, urlObject);
}

function _observeVisibilityChangeOnMainElement(routeViewDriverStream, GmailRouteInfo, element){
	var observer = new MutationObserver(function(mutations){
		var oldValue = mutations[0].oldValue;
		var newValue = mutations[0].target.getAttribute('role');

		if(!oldValue && newValue === 'main'){
			_handleNewUrl(routeViewDriverStream, GmailRouteInfo, location.href);
		}
	});

	observer.observe(
		element,
		{attributes: true, attributeFilter: ['role'], attributeOldValue: true}
	);
}


function _handleNewUrl(routeViewDriverStream, GmailRouteInfo, newUrl){
	var urlObject = getURLObject(newUrl);
	currentUrlObject = urlObject;

	if(!GmailRouteInfo.isNativeRoute(urlObject.name)){
		_createRouteViewDriver(routeViewDriverStream, GmailRouteInfo, urlObject);
		return;
	}

	if(!GmailRouteInfo.isListRouteName(urlObject.name)){
		_createRouteViewDriver(routeViewDriverStream, GmailRouteInfo, urlObject);
		return;
	}

	if(_isThreadRoute(urlObject)){
		_createThreadRouteViewDriver(routeViewDriverStream, GmailRouteInfo, urlObject);
		return;
	}

	_createRouteViewDriver(routeViewDriverStream, GmailRouteInfo, urlObject);
}

function _isThreadRoute(urlObject){
	return GmailElementGetter.getRowListElements().length === 0 || _doesUrlContainThreadId(urlObject);
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
	var options = _.clone(urlObject);
	options.isCustomRoute = !GmailRouteInfo.isNativeRoute(urlObject.name);

	if(options.isCustomRoute){
		options.params.unshift(options.name);
	}

	var routeViewDriver = new GmailRouteView(options, GmailRouteInfo);
	routeViewDriverStream.push(routeViewDriver);
}

module.exports = setupRouteViewDriverStream;
