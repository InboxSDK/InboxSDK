var _ = require('lodash');
var Bacon = require('baconjs');
var waitFor = require('../../../lib/wait-for');

var GmailElementGetter = require('../gmail-element-getter');
var GmailViewNames = require('../views/gmail-route-view/gmail-route-names');

var GmailRouteView = require('../views/gmail-route-view/gmail-route-view');

var getURLObject = require('./get-url-object');

var currentUrlObject = {};

function setupRouteViewDriverStream(gmailDriver){
	gmailDriver._routeViewDriverStream = new Bacon.Bus();

	window.addEventListener('hashchange', function(event){
		_checkForCustomRoute(gmailDriver, event);
	});

	waitFor(function(){
		return !!GmailElementGetter.getMainContentContainer();
	}).then(function(){
		_handleNewUrl(gmailDriver, location.href);

		var mainContentContainer = GmailElementGetter.getMainContentContainer();

		var mainContentObserver = new MutationObserver(function(mutations){
			if(mutations[0].removedNodes.length > 0){
				return;
			}

			_handleNewUrl(gmailDriver, location.href);

			mutations.forEach(function(mutation){
				Array.prototype.forEach.call(mutation.addedNodes, function(element){
					_observeVisibilityChangeOnMainElement(gmailDriver, element);
				});
			});
		});

		mainContentObserver.observe(
			mainContentContainer,
			{childList: true}
		);

		_observeVisibilityChangeOnMainElement(gmailDriver, GmailElementGetter.getCurrentMainContentElement());
	});
}

function _checkForCustomRoute(gmailDriver, event){
	var urlObject = getURLObject(event.newURL);
	if(currentUrlObject.hash === urlObject.hash){
		return;
	}

	if(_isGmailView(urlObject.name) && _isGmailView(currentUrlObject.name)){
		return;
	}

	currentUrlObject = urlObject;
	_createRouteViewDriver(gmailDriver, urlObject, _isGmailView(urlObject.name));
}

function _observeVisibilityChangeOnMainElement(gmailDriver, element){
	var observer = new MutationObserver(function(mutations){
		var oldValue = mutations[0].oldValue;
		var newValue = mutations[0].target.getAttribute('role');

		if(!oldValue && newValue === 'main'){
			_handleNewUrl(gmailDriver, location.href);
		}
	});

	observer.observe(
		element,
		{attributes: true, attributeFilter: ['role'], attributeOldValue: true}
	);
}


function _handleNewUrl(gmailDriver, newUrl){
	var urlObject = getURLObject(newUrl);
	currentUrlObject = urlObject;

	if(!_isGmailView(urlObject.name)){
		_createRouteViewDriver(gmailDriver, urlObject, false);
		return;
	}

	if(!_isThreadListView(urlObject.name)){
		_createRouteViewDriver(gmailDriver, urlObject, true);
		return;
	}

	if(_isThreadView(urlObject)){
		_createThreadRouteViewDriver(gmailDriver, urlObject);
		return;
	}

	_createRouteViewDriver(gmailDriver, urlObject, true);
}

function _isGmailView(viewName){
	return GmailViewNames.GMAIL_VIEWS.indexOf(viewName) > -1;
}

function _isThreadListView(viewName){
	return GmailViewNames.GMAIL_THREAD_LIST_VIEWS.indexOf(viewName) > -1;
}

function _isThreadView(urlObject){
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

function _createThreadRouteViewDriver(gmailDriver, urlObject){
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
		_createRouteViewDriver(gmailDriver, urlObject, true);
	});
}


function _createRouteViewDriver(gmailDriver, urlObject, isGmailView){
	var options = _.clone(urlObject);
	options.isCustomView = !isGmailView;

	var routeViewDriver = new GmailRouteView(options);

	gmailDriver._routeViewDriverStream.push(routeViewDriver);
}

module.exports = setupRouteViewDriverStream;
