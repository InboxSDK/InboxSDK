var _ = require('lodash');
var Bacon = require('baconjs');
var $ = require('jquery');

var GmailElementGetter = require('../gmail-element-getter');

var ThreadViewDriver = require('../../../driver-interfaces/thread-view-driver');
var GmailMessageView = require('./gmail-message-view');
var GmailToolbarView = require('./gmail-toolbar-view');

var GmailContentPanelContainerView = require('../widgets/gmail-content-panel/gmail-content-panel-container-view');

var GmailThreadView = function(element, fullscreeViewDriver){
	ThreadViewDriver.call(this, element);

	this._element = element;
	this._fullscreenViewDriver = fullscreeViewDriver;

	this._eventStream = new Bacon.Bus();

	this._setupToolbarView();
	this._setupMessageViewStream();
};

GmailThreadView.prototype = Object.create(ThreadViewDriver.prototype);

_.extend(GmailThreadView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_fullscreenViewDriver', destroy: false, get: true},
		{name: '_sidebarContentPanelContainerView', destroy: true},
		{name: '_toolbarView', destroy: true, get: true},
		{name: '_newMessageMutationObserver', destroy: false},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_messageViews', destroy: true, get: true, defaultValue: []}
	],

	addSidebarContentPanel: function(descriptor, appId){
		if(!this._sidebarContentPanelContainerView){
			var sidebarElement = GmailElementGetter.getSidebarContainerElement();

			if(!sidebarElement){
				console.warn('This view does not have a sidebar');
				return;
			}
			else{
				this._setupSidebarView(sidebarElement);
			}
		}

		return this._sidebarContentPanelContainerView.addContentPanel(descriptor, appId);
	},

	_setupToolbarView: function(){
		var toolbarElement = this._findToolbarElement();

		this._toolbarView = new GmailToolbarView(toolbarElement);
		this._toolbarView.setThreadViewDriver(this);
	},

	_setupSidebarView: function(sidebarElement){
		this._sidebarContentPanelContainerView = new GmailContentPanelContainerView();
		sidebarElement.classList.add('inboxsdk__sidebar');
		sidebarElement.insertBefore(this._sidebarContentPanelContainerView.getElement(), sidebarElement.firstElementChild);
	},

	_findToolbarElement: function(){
		var toolbarContainerElements = document.querySelectorAll('[gh=tm]');
		for(var ii=0; ii<toolbarContainerElements.length; ii++){
			if(this._isToolbarContainerRelevant(toolbarContainerElements[ii])){
				return toolbarContainerElements[ii].querySelector('[gh=mtb]');
			}
		}

		return null;
	},

	_isToolbarContainerRelevant: function(toolbarContainerElement){
		if(toolbarContainerElement.parentElement.parentElement === this._element.parentElement.parentElement){
			return true;
		}

		if(toolbarContainerElement.parentElement.getAttribute('role') !== 'main' && this._element.parentElement.getAttribute('role') !== 'main'){
			return true;
		}

		if(toolbarContainerElement.parentElement.getAttribute('role') === 'main' && toolbarContainerElement.parentElement.querySelector('.if') && toolbarContainerElement.parentElement.querySelector('.if').parentElement === this._element){
			return true;
		}

		return false;
	},

	_setupMessageViewStream: function(){
		var openMessage = this._element.querySelector('.h7');

		if(!openMessage){
			var self = this;
			setTimeout(function(){
				if (self._element) {
					self._setupMessageViewStream();
				}
			}, 500);
			return;
		}

		var messageContainer = openMessage.parentElement;

		this._initializeExistingMessages(messageContainer);
		this._observeNewMessages(messageContainer);
	},

	_initializeExistingMessages: function(messageContainer){
		var self = this;
		var children = messageContainer.children;
		Array.prototype.forEach.call(children, function(childElement){
			self._createMessageView(childElement);
		});
	},

	_observeNewMessages: function(messageContainer){
		this._newMessageMutationObserver = new MutationObserver(this._handleNewMessageMutations.bind(this));
		this._newMessageMutationObserver.observe(
			messageContainer,
			{childList: true}
		);
	},

	_handleNewMessageMutations: function(mutations){
		var self = this;
		mutations.forEach(function(mutation){
			Array.prototype.forEach.call(mutation.addedNodes, function(addedNode){
				self._createMessageView(addedNode);
			});
		});
	},

	_createMessageView: function(messageElement) {
		var messageView = new GmailMessageView(messageElement);

		this._eventStream.plug(messageView.getEventStream());

		this._messageViews.push(messageView);
	}

});

module.exports = GmailThreadView;
