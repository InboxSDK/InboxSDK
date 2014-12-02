var _ = require('lodash');
var Bacon = require('baconjs');
var $ = require('jquery');

var MessageViewDriver = require('../../../driver-interfaces/message-view-driver');

var GmailAttachmentAreaView = require('./gmail-attachment-area-view');
var GmailAttachmentCardView = require('./gmail-attachment-card-view');

var GmailMessageView = function(element){
	MessageViewDriver.call(this);

	this._element = element;
	this._eventStreamBus = new Bacon.Bus();

	this._replyElementStream = this._eventStreamBus.filter(function(event) {
		return event.eventName === 'replyElement';
	}).map('.change');

	this._setupMessageStateStream();
	this._processInitialState();
};

GmailMessageView.prototype = Object.create(MessageViewDriver.prototype);

_.extend(GmailMessageView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_messageStateMutationObserver', destroy: false},
		{name: '_replyAreaStateMutationObserver', destroy: false},
		{name: '_eventStreamBus', destroy: true, destroyFunction: 'end'},
		{name: '_replyElementStream', destroy: false, get: true},
		{name: '_gmailAttachmentAreaView', destroy: true},
		{name: '_addedAttachmentCardOptions', destroy: false, defaultValue: {}},
		{name: '_addedDownloadAllAreaButtonOptions', destroy: false, defaultValue: {}},
		{name: '_messageLoaded', destroy: false, defaultValue: false}
	],

	getContentsElement: function(){
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

	getAttachmentCardViewDrivers: function(){
		if(!this._gmailAttachmentAreaView){
			this._gmailAttachmentAreaView = this._getAttachmentArea();
		}

		if(!this._gmailAttachmentAreaView){
			return [];
		}

		return this._gmailAttachmentAreaView.getGmailAttachmentCardViews();
	},

	getEventStream: function(){
		return this._eventStreamBus;
	},

	addAttachmentCard: function(options){
		var attachmentCardOptionsHash = this._getAttachmentCardOptionsHash(options);

		if(this._addedAttachmentCardOptions[attachmentCardOptionsHash]){
			return;
		}

		var gmailAttachmentCardView = new GmailAttachmentCardView(options);

		if(!this._gmailAttachmentAreaView){
			this._gmailAttachmentAreaView = this._getAttachmentArea();
		}

		if(!this._gmailAttachmentAreaView){
			this._gmailAttachmentAreaView = this._createAttachmentArea();
		}

		this._gmailAttachmentAreaView.addGmailAttachmentCardView(gmailAttachmentCardView);

		this._addedAttachmentCardOptions[attachmentCardOptionsHash] = true;
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

	_setupMessageStateStream: function(){
		this._messageStateMutationObserver = new MutationObserver(this._handleMessageStateMutations.bind(this));
		this._messageStateMutationObserver.observe(
			this._element,
			{attributes: true, attributeFilter: ['class'], attributeOldValue: true}
		);
	},

	_handleMessageStateMutations: function(mutations){
		var self = this;

		mutations.forEach(function(mutation){
			var currentClassList = mutation.target.classList;

			if(mutation.oldValue.indexOf('h7') > -1){ //we were open
				if(!currentClassList.contains('h7')){
					self._eventStreamBus.push({
						eventName: 'messageClosed',
						view: self
					});

					return;
				}
			}
			else {
				self._checkMessageOpenState(currentClassList);
			}
		});
	},

	_processInitialState: function(){
		var self = this;

		setTimeout(
			function(){
				if (self._element) {
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

		this._eventStreamBus.push({
			eventName: 'messageOpen',
			view: this
		});

		if(this._messageLoaded){
			return;
		}

		this._eventStreamBus.push({
			eventName: 'messageLoaded',
			view: this
		});

		this._messageLoaded = true;

		this._setupReplyStream();
	},

	_setupReplyStream: function(){
		var replyContainer = this._element.querySelector('.ip');

		if(!replyContainer){
			return;
		}

		if(!this._replyAreaStateMutationObserver){
			this._replyAreaStateMutationObserver = new MutationObserver(this._handleReplyAreaStateMutations.bind(this));
		}

		this._replyAreaStateMutationObserver.observe(
			replyContainer,
			{attributes: true, attributeFilter: ['class'], attributeOldValue: true}
		);

		if(replyContainer.classList.contains('adB')){
			this._eventStreamBus.push({
				eventName: 'replyElement',
				change: {
					type: 'added', el: replyContainer
				}
			});
		}
	},

	_handleReplyAreaStateMutations: function(mutations){
		var mutation = mutations[0];
		var currentClassList = mutation.target.classList;
		var oldValue = mutation.oldValue;

		if(currentClassList.contains('adB')){
			if(oldValue.indexOf('adB') === -1){
				this._eventStreamBus.push({
					eventName: 'replyElement',
					change: {
						type: 'added', el: mutation.target
					}
				});
			}
		}
		else{
			this._eventStreamBus.push({
				eventName: 'replyElement',
				change: {
					type: 'removed', el: mutation.target
				}
			});
		}
	},

	_getAttachmentCardOptionsHash: function(options){
		return options.fileName + options.previewUrl + options.downloadUrl;
	},

	_getDownloadAllAreaButtonOptionsHash: function(options){
		return options.iconClass + options.tooltip;
	},

	_getAttachmentArea: function(){
		if(this._element.querySelector('.hq')){
			return new GmailAttachmentAreaView(this._element.querySelector('.hq'));
		}

		return null;
	},

	_createAttachmentArea: function(){
		var gmailAttachmentAreaView = new GmailAttachmentAreaView();

		var beforeElement = this._element.querySelector('.hi');
		beforeElement.parentNode.insertBefore(gmailAttachmentAreaView.getElement(), beforeElement);

		return gmailAttachmentAreaView;
	}

});

module.exports = GmailMessageView;
