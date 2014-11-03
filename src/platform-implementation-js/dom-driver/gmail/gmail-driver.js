var _ = require('lodash');
var Bacon = require('baconjs');

require('./custom-style');

var Driver = require('../../driver-interfaces/driver');
var ElementMonitor = require('../../lib/dom/element-monitor');
var GmailElementGetter = require('./gmail-element-getter');
var waitFor = require('../../lib/wait-for');

var GmailComposeView = require('./views/gmail-compose-view');
var GmailThreadView = require('./views/gmail-thread-view');

var GmailStandardThreadViewMonitor = require('./views/thread-view/standard-thread-view-monitor');
var GmailPreviewPaneThreadViewMonitor = require('./views/thread-view/preview-pane-thread-view-monitor');

var GmailDriver = function(){
	Driver.call(this);

	this._setupEventStreams();
};

GmailDriver.prototype = Object.create(Driver.prototype);

_.extend(GmailDriver.prototype, {

	__memberVariables: [
		{name: '_threadViewDriverStream', destroy: false, get: true, destroyFunction: 'end'},
		{name: '_composeViewDriverStream', destroy: false, get: true, destroyFunction: 'end'},
		{name: '_messageViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_attachmentCardViewDriverStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_composeElementMonitor', destroy: true},
		{name: '_standardThreadViewMonitor', destroy: true},
		{name: '_previewPaneThreadViewMonitor', destroy: true}
	],

	_setupEventStreams: function(){
		this._setupThreadViewDriverStream();
		this._setupComposeViewDriverStream();
		this._setupMessageViewDriverStream();
		this._setupAttachmentCardViewDriverStream();
	},

	_setupComposeViewDriverStream: function(){
		this._composeViewDriverStream = new Bacon.Bus();

		var self = this;

		GmailElementGetter.waitForGmailModeToSettle().then(function(){
			if(GmailElementGetter.isStandaloneComposeWindow()){
				self._setupStandaloneComposeViewDriverStream();
			}
			else{
				self._setupStandardComposeViewDriverStream();
			}

			self._composeViewDriverStream.plug(self._composeElementMonitor.getViewAddedEventStream());
		});

		this._threadViewDriverStream.onValue(function(gmailThreadView){
			self._composeViewDriverStream.plug(
				gmailThreadView.getMessageStateStream().filter(function(event){
					return event.eventName === 'replyOpen';
				})
				.map(function(event){
					return event.view;
				})
			);
		});
	},

	_setupStandaloneComposeViewDriverStream: function(){
		this._composeElementMonitor = new ElementMonitor({
			elementMembershipTest: function(element){
				return true;
			},

			viewCreationFunction: function(element){
				return new GmailComposeView(element);
			}
		});


		var self = this;
		waitFor(function(){
			return !!GmailElementGetter.StandaloneCompose.getComposeWindowContainer();
		}).then(function(){
			var composeContainer = GmailElementGetter.StandaloneCompose.getComposeWindowContainer();
			self._composeElementMonitor.setObservedElement(GmailElementGetter.StandaloneCompose.getComposeWindowContainer());
		});
	},

	_setupStandardComposeViewDriverStream: function(){
		this._composeElementMonitor = new ElementMonitor({
			elementMembershipTest: function(element){
				return element.classList.contains('nn') && element.children.length > 0;
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
	},

	getThreadViewDriverStream: function(){
		// we debounce because preview pane and standard thread watching can throw off
		// events for the same thread in certain edge cases
		// (namely preview pane active, but refreshing in thread view)
		return this._threadViewDriverStream.debounceImmediate(20);
	},

	_setupThreadViewDriverStream: function(){
		this._threadViewDriverStream = new Bacon.Bus();

		this._standardThreadViewMonitor = new GmailStandardThreadViewMonitor();
		this._threadViewDriverStream.plug(this._standardThreadViewMonitor.getThreadViewStream());

		this._previewPaneThreadViewMonitor = new GmailPreviewPaneThreadViewMonitor();
		this._threadViewDriverStream.plug(this._previewPaneThreadViewMonitor.getThreadViewStream());
	},

	_setupMessageViewDriverStream: function(){
		this._messageViewDriverStream = new Bacon.Bus();

		var self = this;
		this.getThreadViewDriverStream().onValue(function(gmailThreadView){
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

	_setupAttachmentCardViewDriverStream: function(){
		this._attachmentCardViewDriverStream = new Bacon.Bus();

		var self = this;
		this.getThreadViewDriverStream().onValue(function(gmailThreadView){
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
