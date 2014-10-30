var _ = require('lodash');
var ThreadViewDriver = require('../../../driver-interfaces/thread-view-driver');
var GmailMessageView = require('./gmail-message-view');

var GmailThreadView = function(element){
	ThreadViewDriver.call(this, element);

	this._element = element;

	this._eventStreamBus = new Streak.Bacon.Bus();
	this._setupMessageViewStream();
};

GmailThreadView.prototype = Object.create(ThreadViewDriver.prototype);

_.extend(GmailThreadView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_newMessageMutationObserver', destroy: false},
		{name: '_eventStreamBus', destroy: true, destroyFunction: 'end'},
		{name: '_messageViews', destroy: true, get: true, defaultValue: []}
	],

	getMessageStateStream: function(){
		return this._eventStreamBus;
	},

	_setupMessageViewStream: function(){
		var openMessage = this._element.querySelector('.h7');

		if(!openMessage){
			var self = this;
			setTimeout(function(){self._setupMessageViewStream();}, 500);
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

		this._eventStreamBus.plug(messageView.getMessageStateStream());

		this._messageViews.push(messageView);
	}

});

module.exports = GmailThreadView;
