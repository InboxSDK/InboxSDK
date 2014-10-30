var _ = require('lodash');
var Bacon = require('baconjs');

var Driver = require('../../driver-interfaces/driver');
var ElementMonitor = require('../../lib/dom/element-monitor');
var GmailElementGetter = require('./gmail-element-getter');
var waitFor = require('../../lib/wait-for');

var GmailComposeView = require('./gmail-compose-view');
var GmailThreadView = require('./gmail-thread-view');

var GmailDriver = function(){
	Driver.call(this);

	var self = this;
	setTimeout(
		function(){
			self._setupEventStreams();
		},
		1
	);
};

GmailDriver.prototype = Object.create(Driver.prototype);

_.extend(GmailDriver.prototype, {

	__memberVariables: [
		{name: '_composeViewDriverStream', destroy: false, get: true},
		{name: '_composeElementMonitor', destroy: true},
		{name: '_threadViewDriverStream', destroy: false, get: true},
		{name: '_threadElementMonitor', destroy: true},
		{name: '_previewPaneThreadElementMonitor', destroy: true},
		{name: '_messageViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_replyViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_attachmentCardViewDriverStream', destroy: true, get: true, destroyFunction: 'end'}
	],

	_setupEventStreams: function(){
		this._setupComposeViewDriverStream();
		this._setupThreadViewDriverStream();
		this._setupMessageViewDriverStream();
		this._setupReplyViewDriverStream();
		this._setupAttachmentCardViewDriverStream();
	},

	_setupComposeViewDriverStream: function(){
		this._composeElementMonitor = new ElementMonitor({
			elementMemberShipTest: function(element){
				return element.classList.contains('nn');
			},

			viewCreationFunction: function(element){
				return new GmailComposeView(element);
			}
		});

		var self = this;
		waitFor(function(){
			return !!GmailElementGetter.getComposeWindowContainer();
		}).then(function(){
			var composeContainer = GmailElementGetter.getComposeWindowContainer();
			self._composeElementMonitor.setObservedElement(composeContainer);
		});

		this._composeViewDriverStream = this._composeElementMonitor.getViewAddedEventStream();
	},

	_setupThreadViewDriverStream: function(){
		this._threadElementMonitor = new ElementMonitor({
			elementMemberShipTest: function(element){
				if(element.children.length !== 1){
					return false;
				}

				if(!element.children[0].classList.contains('g')){
					return false;
				}

				if(!element.children[0].classList.contains('id')){
					return false;
				}

				return true;
			},

			viewCreationFunction: function(element){
				return new GmailThreadView(element);
			}
		});

		var self = this;
		waitFor(function(){
			return !!GmailElementGetter.getMainContentContainer();
		}).then(function(){
			var threadContainerElement = GmailElementGetter.getMainContentContainer();
			self._threadElementMonitor.setObservedElement(threadContainerElement);
		});

		this._threadViewDriverStream = this._threadElementMonitor.getViewAddedEventStream();
	},

	_setupMessageViewDriverStream: function(){
		this._messageViewDriverStream = new Bacon.Bus();

		var self = this;
		this._threadViewDriverStream.onValue(function(gmailThreadView){
			self._messageViewDriverStream.plug(
				gmailThreadView.getMessageStateStream().filter(function(event){
					return event.eventName === 'messageOpen';
				})
				.map(function(event){
					return event.view;
				})
			);
		});
	},

	_setupReplyViewDriverStream: function(){
		this._replyViewDriverStream = new Bacon.Bus();

		var self = this;
		this._threadViewDriverStream.onValue(function(gmailThreadView){
			self._replyViewDriverStream.plug(
				gmailThreadView.getMessageStateStream().filter(function(event){
					return event.eventName === 'replyOpen';
				})
				.map(function(event){
					return event.view;
				})
			);
		});
	},

	_setupAttachmentCardViewDriverStream: function(){
		this._attachmentCardViewDriverStream = new Bacon.Bus();

		var self = this;
		this._threadViewDriverStream.onValue(function(gmailThreadView){
			self._attachmentCardViewDriverStream.plug(
				gmailThreadView.getMessageStateStream().filter(function(event){
					return event.eventName === 'newAttachmentCard';
				})
				.map(function(event){
					return event.view;
				})
			);
		});
	}

});

module.exports = GmailDriver;
