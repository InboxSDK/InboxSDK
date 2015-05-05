var _ = require('lodash');
var Bacon = require('baconjs');
var $ = require('jquery');

var MessageViewDriver = require('../../../driver-interfaces/message-view-driver');

var GmailAttachmentAreaView = require('./gmail-attachment-area-view');
var GmailAttachmentCardView = require('./gmail-attachment-card-view');

var makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');
var simulateClick = require('../../../lib/dom/simulate-click');

var GmailMessageView = function(element, gmailThreadView, driver){
	MessageViewDriver.call(this);

	this._element = element;
	this._eventStream = new Bacon.Bus();
	this._stopper = this._eventStream.filter(false).mapEnd();
	this._threadViewDriver = gmailThreadView;
	this._driver = driver;

	// Outputs the same type of stream as makeElementChildStream does.
	this._replyElementStream = this._eventStream.filter(function(event) {
		return event.eventName === 'replyElement';
	}).map('.change');

	this._setupMessageStateStream();
	this._processInitialState();
	this._monitorEmailAddressHovering();
};

GmailMessageView.prototype = Object.create(MessageViewDriver.prototype);

_.extend(GmailMessageView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_stopper', destroy: false},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_threadViewDriver', destroy: false, get: true},
		{name: '_driver', destroy: false},
		{name: '_replyElementStream', destroy: false, get: true},
		{name: '_gmailAttachmentAreaView', destroy: true},
		{name: '_addedDownloadAllAreaButtonOptions', destroy: false, defaultValue: {}},
		{name: '_messageLoaded', destroy: false, defaultValue: false}
	],

	isLoaded: function(){
		return this._messageLoaded;
	},

	getContentsElement: function(){
		if(!this._messageLoaded){
			throw new Error('tried to get message contents before message is loaded');
		}

		return this._element.querySelector('.adP');
	},

	getLinks: function(){
		var anchors = this.getContentsElement().querySelectorAll('a');

		var self = this;
		return _.map(anchors, function(anchor){
			return {
				text: anchor.textContent,
				html: anchor.innerHTML,
				href: anchor.href,
				element: anchor,
				isInQuotedArea: self.isElementInQuotedArea(anchor)
			};
		});
	},

	isElementInQuotedArea: function(element){
		return $(element).parents('blockquote').length > 0;
	},

	getSender: function(){
		var senderSpan = this._element.querySelector('h3.iw span[email]');
		return {
			name: senderSpan.getAttribute('name'),
			emailAddress: senderSpan.getAttribute('email')
		};
	},

	getRecipients: function(){
		var receipientSpans = this._element.querySelectorAll('.hb span[email]');
		return _.map(receipientSpans, function(span){
			return {
				name: span.getAttribute('name'),
				emailAddress: span.getAttribute('email')
			};
		});
	},

	getAttachmentCardViewDrivers: function(){
		if(!this._gmailAttachmentAreaView){
			return [];
		}

		return this._gmailAttachmentAreaView.getAttachmentCardViews();
	},

	addAttachmentCardNoPreview: function(options){
		var newOptions = _.clone(options);

		return this._addAttachmentCard(newOptions);
	},

	addAttachmentCard: function(options){
		var newOptions = _.clone(options);

		delete newOptions.iconThumbnailUrl;

		return this._addAttachmentCard(newOptions);
	},

	addButtonToDownloadAllArea: function(options){
		var gmailAttachmentAreaView = this._getAttachmentArea();

		if(!gmailAttachmentAreaView){
			return;
		}

		var optionsHash = this._getDownloadAllAreaButtonOptionsHash(options);
		if(this._addedDownloadAllAreaButtonOptions[optionsHash]){
			return;
		}

		gmailAttachmentAreaView.addButtonToDownloadAllArea(options);

		this._addedDownloadAllAreaButtonOptions[optionsHash] = true;
	},

	getMessageID() {
		const messageEl = this._element.querySelector("div.ii.gt");
		if (!messageEl) {
			this._driver.getLogger().error(new Error("Could not find message id element"));
			return;
		}
		const m = messageEl.className.match(/\bm(\w+)\b/);
		if (!m) {
			this._driver.getLogger().error(new Error("Could not find message id value"));
			return;
		}
		return m[1];
	},

	getViewState: function(){
		if(this._element.classList.contains('kQ')){
			return 'HIDDEN';
		}
		else if(this._element.classList.contains('kv')){
			return 'COLLAPSED';
		}
		else{
			return 'EXPANDED';
		}
	},

	setViewState: function(viewState){
		if(viewState === this.getViewState() || viewState === 'HIDDEN'){
			return;
		}

		simulateClick(this._element.querySelector('.iv'));
	},

	_addAttachmentCard: function(options){
		var gmailAttachmentCardView = new GmailAttachmentCardView(options, this._driver);

		if(!this._gmailAttachmentAreaView){
			this._gmailAttachmentAreaView = this._getAttachmentArea();
		}

		if(!this._gmailAttachmentAreaView){
			this._gmailAttachmentAreaView = this._createAttachmentArea();
		}

		this._gmailAttachmentAreaView.addGmailAttachmentCardView(gmailAttachmentCardView);

		return gmailAttachmentCardView;
	},

	_setupMessageStateStream: function(){
		var self = this;

		this._eventStream.plug(
			makeMutationObserverStream(this._element, {
				attributes: true, attributeFilter: ['class'], attributeOldValue: true
			}).takeUntil(this._stopper)
			  .map(function(mutation) {
				var currentClassList = mutation.target.classList;

				var oldValue;
				var newValue;

				if(mutation.oldValue.indexOf('kQ') > -1){
					oldValue = 'HIDDEN';
				}
				else if(mutation.oldValue.indexOf('kv') > -1 || mutation.oldValue.indexOf('ky') > -1){
					oldValue = 'COLLAPSED';
				}
				else if(mutation.oldValue.indexOf('h7') > -1){
					oldValue = 'EXPANDED';
				}

				if(currentClassList.contains('kQ')){
					newValue = 'HIDDEN';
				}
				else if(currentClassList.contains('kv') || currentClassList.contains('ky')){
					newValue = 'COLLAPSED';
				}
				else if(currentClassList.contains('h7')){
					newValue = 'EXPANDED';
				}

				return {
					oldValue: oldValue,
					newValue: newValue,
					currentClassList: currentClassList
				};
			})
			.doAction(function(event){
				if(event.newValue === 'EXPANDED' && event.oldValue !== 'EXPANDED'){
					self._checkMessageOpenState(event.currentClassList);
				}
			})
			.filter(function(event){
				return event.newValue !== event.oldValue && !!event.oldValue && !!event.newValue;
			})
			.map(function(event){
				return {
					eventName: 'viewStateChange',
					oldValue: event.oldValue,
					newValue: event.newValue
				};
			})
		);

	},

	_processInitialState: function(){
		var self = this;

		setTimeout(
			function(){
				if (self._element) {
					self._eventStream.push({
						type: 'internal',
						eventName: 'messageCreated',
						view: self
					});
					self._checkMessageOpenState(self._element.classList);
				}
			},
			1
		);
	},

	_checkMessageOpenState: function(classList){
		if(!classList.contains('h7')){
			return;
		}

		if(this._messageLoaded){
			return;
		}
		this._messageLoaded = true;


		this._gmailAttachmentAreaView = this._getAttachmentArea();
		var self = this;

		this._eventStream.push({
			type: 'internal',
			eventName: 'messageLoad',
			view: this
		});

		this._setupReplyStream();
	},

	_setupReplyStream: function(){
		var replyContainer = this._element.querySelector('.ip');

		if(!replyContainer){
			return;
		}

		var self = this;
		var currentReplyElementRemovalStream = null;

		makeMutationObserverStream(replyContainer, {
			attributes: true, attributeFilter: ['class']
		}).takeUntil(this._stopper).startWith(null).mapEnd('END').onValue(function(mutation) {
			if (mutation !== 'END' && replyContainer.classList.contains('adB')) {
				if (!currentReplyElementRemovalStream) {
					currentReplyElementRemovalStream = new Bacon.Bus();
					self._eventStream.push({
						type: 'internal',
						eventName: 'replyElement',
						change: {
							el: replyContainer, removalStream: currentReplyElementRemovalStream
						}
					});
				}
			} else {
				if (currentReplyElementRemovalStream) {
					// Ending the currentReplyElementRemovalStream can trigger something
					// that triggers the mutation observer stream which will call back into
					// this function before we've unset currentReplyElementRemovalStream,
					// so we need to copy the bus to a temporary variable and unset
					// currentReplyElementRemovalStream first.
					var temp = currentReplyElementRemovalStream;
					currentReplyElementRemovalStream = null;
					temp.push(null);
					temp.end();
				}
			}
		});
	},

	_monitorEmailAddressHovering: function(){
		var self = this;
		this._eventStream.plug(
			Bacon.fromEventTarget(this._element, 'mouseover')
				 .map('.target')
				 .filter(function(element){
				 	return element && element.getAttribute('email');
				 })
				 .map(function(element){
				 	var addressInformation = _extractContactInformation(element);
				 	var contactType = null;

					if(!self._element.classList.contains('h7')){
						contactType = 'sender';
					}
					else{
						if(self._element.querySelector('h3.iw').contains(element)){
							contactType = 'sender';
						}
						else{
							contactType = 'recipient';
						}
					}

				 	return {
				 		eventName: 'contactHover',
				 		contact: addressInformation,
				 		contactType: contactType,
				 		messageViewDriver: self
				 	};
				 })

		);
	},

	_getDownloadAllAreaButtonOptionsHash: function(options){
		return options.iconClass + options.tooltip;
	},

	_getAttachmentArea: function(){
		if(this._element.querySelector('.hq')){
			return new GmailAttachmentAreaView(this._element.querySelector('.hq'), this._driver);
		}

		return null;
	},

	_createAttachmentArea: function(){
		var gmailAttachmentAreaView = new GmailAttachmentAreaView(null, this._driver);

		var beforeElement = this._element.querySelector('.hi');
		beforeElement.parentNode.insertBefore(gmailAttachmentAreaView.getElement(), beforeElement);

		return gmailAttachmentAreaView;
	}

});

function _extractContactInformation(span){
	return {
		name: span.getAttribute('name'),
		emailAddress: span.getAttribute('email')
	};
}

module.exports = GmailMessageView;
