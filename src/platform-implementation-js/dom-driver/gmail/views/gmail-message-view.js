const _ = require('lodash');
const Bacon = require('baconjs');
const $ = require('jquery');
const asap = require('asap');

const MessageViewDriver = require('../../../driver-interfaces/message-view-driver');

import GmailAttachmentAreaView from './gmail-attachment-area-view';
import GmailAttachmentCardView from './gmail-attachment-card-view';

import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import simulateClick from '../../../lib/dom/simulate-click';
import extractContactFromEmailContactString from '../../../lib/extract-contact-from-email-contact-string';

const Kefir = require('kefir');
const kefirCast = require('kefir-cast');

var GmailMessageView = function(element, gmailThreadView, driver){
	MessageViewDriver.call(this);

	this._element = element;
	this._eventStream = new Bacon.Bus();
	this._stopper = this._eventStream.filter(false).mapEnd();
	this._kstopper = kefirCast(Kefir, this._stopper);
	this._threadViewDriver = gmailThreadView;
	this._driver = driver;

	// Outputs the same type of stream as makeElementChildStream does.
	this._replyElementStream = this._eventStream.filter(function(event) {
		return event.eventName === 'replyElement';
	}).map('.change');

	this._setupMessageStateStream();
	this._monitorEmailAddressHovering();
	asap(() => {
		this._processInitialState();
	});
};

GmailMessageView.prototype = Object.create(MessageViewDriver.prototype);

_.extend(GmailMessageView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_stopper', destroy: false},
		{name: '_kstopper', destroy: false},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_threadViewDriver', destroy: false, get: true},
		{name: '_driver', destroy: false},
		{name: '_replyElementStream', destroy: false, get: true},
		{name: '_gmailAttachmentAreaView', destroy: true},
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
		return this._getUpdatedContact({
			name: senderSpan.getAttribute('name'),
			emailAddress: senderSpan.getAttribute('email')
		});
	},

	getRecipients: function(){
		var receipientSpans = this._element.querySelectorAll('.hb span[email]');
		return _.map(receipientSpans, (span) => {
			return this._getUpdatedContact({
				name: span.getAttribute('name'),
				emailAddress: span.getAttribute('email')
			});
		});
	},

	getDateString() {
		return this._element.querySelector('.ads .gK .g3').title;
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

		gmailAttachmentAreaView.addButtonToDownloadAllArea(options);
	},

	getMessageID() {
		if(!this._messageLoaded){
			throw new Error('tried to get message id before message is loaded');
		}
		const messageEl = this._element.querySelector("div.ii.gt");
		if (!messageEl) {
			this._driver.getLogger().error(new Error("Could not find message id element"));
			return;
		}
		const m = messageEl.className.match(/\bm([0-9a-f]+)\b/);
		if (!m) {
			this._driver.getLogger().error(new Error("Could not find message id value"));
			return;
		}
		return m[1];
	},

	addAttachmentIcon(iconDescriptor) {
		if (!this._element) {
			console.warn('addDateIcon called on destroyed message');
			return;
		}

		const getImgElement = _.once(() => {
			const img = document.createElement('img');
			img.src = 'images/cleardot.gif';
			return img;
		});

		let added = false;
		let currentIconUrl = null;

		this._kstopper.onValue(() => {
			if (added) {
				getImgElement().remove();
				added = false;
			}
		});

		kefirCast(Kefir, iconDescriptor)
			.takeUntilBy(this._kstopper)
			.onValue(opts => {
				if (!opts) {
					if (added) {
						getImgElement().remove();
						added = false;
					}
				} else {
					const img = getImgElement();

					const onClick = opts.onClick;
					if (onClick) {
						img.onclick = function(event) {
							event.preventDefault();
							event.stopPropagation();
							onClick();
						};
						img.style.cursor = "pointer";
					} else {
						img.onclick = null;
						img.style.cursor = "";
					}

					if(opts.tooltip) {
						img.setAttribute('data-tooltip', opts.tooltip);
					} else {
						img.removeAttribute('data-tooltip');
					}

					img.className =
						'inboxsdk__message_attachment_icon ' +
						(opts.iconClass || '');
					if (currentIconUrl != opts.iconUrl) {
						img.style.background = opts.iconUrl ? "url("+opts.iconUrl+") no-repeat 0 0" : '';
						currentIconUrl = opts.iconUrl;
					}

					const attachmentDiv = this._element.querySelector('td.gH div.gK span');
					if (!attachmentDiv.contains(img)) {
						attachmentDiv.appendChild(img);
						added = true;
					}
				}
			});
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
		this._checkMessageOpenState(this._element.classList);
	},

	_checkMessageOpenState: function(classList){
		if(!classList.contains('h7')){
			return;
		}

		if(this._messageLoaded){
			return;
		}
		this._messageLoaded = true;

		this._driver.associateThreadAndMessageIDs(this._threadViewDriver.getThreadID(), this.getMessageID());
		this._gmailAttachmentAreaView = this._getAttachmentArea();

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

		makeMutationObserverChunkedStream(replyContainer, {
			attributes: true, attributeFilter: ['class']
		}).takeUntil(this._stopper).startWith(null).mapEnd('END').onValue(mutation => {
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
				 	var addressInformation = self._getUpdatedContact(_extractContactInformation(element));

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
	},

	_getUpdatedContact: function(inContact){
		const contact = _.clone(inContact);

		const menuButtonElement = this._element.querySelector('.ajy[aria-haspopup=true]');
		if(menuButtonElement){
			let modalContactName = this._getModalContactName(contact.emailAddress);
			if(!modalContactName){
				//the modal that contains this email address is not visible, so we need to bring the modal up
				simulateClick(menuButtonElement);
				modalContactName = this._getModalContactName(contact.emailAddress);
				simulateClick(menuButtonElement);
			}

			contact.name = modalContactName || contact.name;
		}

		return contact;
	},

	_getModalContactName(emailAddress) {
		const nameSpans = document.querySelectorAll('.ajC [email]');
		let foundNameSpan = _.find(nameSpans, span => span.getAttribute('email') === emailAddress);
		if(foundNameSpan){
			if(foundNameSpan.getAttribute('name')){
				return foundNameSpan.getAttribute('name');
			}
			else{
				const stringContact = extractContactFromEmailContactString(foundNameSpan.textContent);
				if(emailAddress === stringContact.emailAddress){
					return stringContact.name;
				}
			}
		}

		return null;
	}

});

function _extractContactInformation(span){
	return {
		name: span.getAttribute('name'),
		emailAddress: span.getAttribute('email')
	};
}

module.exports = GmailMessageView;
