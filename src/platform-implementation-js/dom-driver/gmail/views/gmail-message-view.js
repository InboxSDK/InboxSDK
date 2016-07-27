/* @flow */

import _ from 'lodash';
import $ from 'jquery';
import asap from 'asap';
import {defn} from 'ud';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import kefirCast from 'kefir-cast';

import GmailAttachmentAreaView from './gmail-attachment-area-view';
import GmailAttachmentCardView from './gmail-attachment-card-view';

import getUpdatedContact from './gmail-message-view/get-updated-contact';

import delayAsap from '../../../lib/delay-asap';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import simulateClick from '../../../lib/dom/simulate-click';
import extractContactFromEmailContactString from '../../../lib/extract-contact-from-email-contact-string';
import censorHTMLtree from '../../../../common/censor-html-tree';

import type GmailDriver from '../gmail-driver';
import type GmailThreadView from './gmail-thread-view';
import type GmailToolbarView from './gmail-toolbar-view';

import type {MessageViewDriver, VIEW_STATE} from '../../../driver-interfaces/message-view-driver';

let hasSeenOldElement = false;

class GmailMessageView {
	_element: HTMLElement;
	_driver: GmailDriver;
	_eventStream: Kefir.Bus;
	_stopper: Kefir.Stream&{destroy: () => void};
	_threadViewDriver: GmailThreadView;
	_moreMenuItemDescriptors: Array<Object>;
	_moreMenuAddedElements: Array<HTMLElement>;
	_replyElementStream: Kefir.Stream;
	_replyElement: ?HTMLElement;
	_gmailAttachmentAreaView: ?GmailAttachmentAreaView;
	_messageLoaded: boolean = false;
	_openMoreMenu: ?HTMLElement;
	_sender: ?Contact = null;
	_recipients: ?Contact[] = null;

	constructor(element: HTMLElement, gmailThreadView: GmailThreadView, driver: GmailDriver){
		this._element = element;
		this._eventStream = kefirBus();
		this._stopper = kefirStopper();

		this._threadViewDriver = gmailThreadView;
		this._driver = driver;
		this._moreMenuItemDescriptors = [];
		this._moreMenuAddedElements = [];
		this._replyElement = null;

		// Outputs the same type of stream as makeElementChildStream does.
		this._replyElementStream = this._eventStream.filter(function(event) {
			return event.eventName === 'replyElement';
		}).map(event => event.change);

		this._setupMessageStateStream();
		this._monitorEmailAddressHovering();
		this._setupMoreMenuWatching();
		this._processInitialState();
	}

	destroy() {
		this._stopper.destroy();
		this._eventStream.end();
		if(this._gmailAttachmentAreaView) this._gmailAttachmentAreaView.destroy();

		this._moreMenuAddedElements.forEach(el => {
			el.remove();
		});
	}

	getEventStream(): Kefir.Stream {
		return this._eventStream;
	}

	getReplyElementStream(): Kefir.Stream {
		return this._replyElementStream;
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getThreadViewDriver(): GmailThreadView {
		return this._threadViewDriver;
	}

	isLoaded(): boolean {
		return this._messageLoaded;
	}

	getContentsElement(): HTMLElement {
		if(!this._messageLoaded){
			throw new Error('tried to get message contents before message is loaded');
		}

		return this._element.querySelector('.adP');
	}

	isElementInQuotedArea(element: HTMLElement): boolean {
		return $(element).closest('blockquote').length > 0;
	}

	getSender(): Contact {
		let sender = this._sender;
		if(sender) return sender;

		var senderSpan = this._element.querySelector('h3.iw span[email]');
		sender = this._sender = this._getUpdatedContact({
			name: senderSpan.getAttribute('name'),
			emailAddress: senderSpan.getAttribute('email')
		});

		return sender;
	}

	getRecipients(): Array<Contact> {
		let recipients = this._recipients;
		if(recipients) return recipients;
		var receipientSpans = this._element.querySelectorAll('.hb span[email]');
		recipients = this._recipients = _.map(receipientSpans, (span) => {
			return this._getUpdatedContact({
				name: span.getAttribute('name'),
				emailAddress: span.getAttribute('email')
			});
		});

		return recipients;
	}

	getDateString(): string {
		return this._element.querySelector('.ads .gK .g3').title;
	}

	getAttachmentCardViewDrivers(): Array<GmailAttachmentCardView> {
		if(!this._gmailAttachmentAreaView){
			return [];
		}

		return this._gmailAttachmentAreaView.getAttachmentCardViews();
	}

	addAttachmentCardNoPreview(options: Object ){
		var newOptions = _.clone(options);

		return this._addAttachmentCard(newOptions);
	}

	addAttachmentCard(options: Object ){
		var newOptions = _.clone(options);

		delete newOptions.iconThumbnailUrl;

		return this._addAttachmentCard(newOptions);
	}

	addButtonToDownloadAllArea(options: Object ){
		var gmailAttachmentAreaView = this._getAttachmentArea();

		if(!gmailAttachmentAreaView){
			return;
		}

		gmailAttachmentAreaView.addButtonToDownloadAllArea(options);
	}

	addMoreMenuItem(options: Object) {
		this._moreMenuItemDescriptors = _.sortBy(
			this._moreMenuItemDescriptors.concat([options]),
			o => o.orderHint
		);
		this._updateMoreMenu();
	}

	_setupMoreMenuWatching() {
		// At the start, and whenever the view state changes, watch the
		// 'aria-expanded' property of the more button, and when that changes,
		// update the _openMoreMenu property.
		this._openMoreMenu = null;
		this._eventStream
			.filter(e => e.eventName === 'viewStateChange')
			.toProperty(() => null)
			.flatMapLatest(() => {
				const moreButton = this._getMoreButton();
				if (!moreButton) {
					return Kefir.constant(null);
				}
				return makeMutationObserverChunkedStream(moreButton, {
						attributes: true,
						attributeFilter: ['aria-expanded']
					})
					.map(() =>
						moreButton.getAttribute('aria-expanded') === 'true' ?
							this._getOpenMoreMenu() : null
					);
			})
			.takeUntilBy(this._stopper)
			.onValue(openMoreMenu => {
				this._openMoreMenu = openMoreMenu;
				this._updateMoreMenu();
			});
	}

	_getMoreButton(): ?HTMLElement {
		if (this.getViewState() !== 'EXPANDED') {
			return null;
		}
		return this._element.querySelector('tr.acZ div.T-I.J-J5-Ji.aap.L3[role=button][aria-haspopup]');
	}

	_getOpenMoreMenu(): HTMLElement {
		// This will find any message's open more menu! The caller needs to make
		// sure it belongs to this message!
		return document.body.querySelector('td > div.nH.if > div.nH.aHU div.b7.J-M[aria-haspopup=true]');
	}

	_closeActiveEmailMenu() {
		const moreButton = this._getMoreButton();
		if (moreButton) {
			simulateClick(moreButton);
		}
	}

	_updateMoreMenu() {
		this._moreMenuAddedElements.forEach(el => {
			el.remove();
		});
		this._moreMenuAddedElements.length = 0;

		const openMoreMenu = this._openMoreMenu;
		if (openMoreMenu && this._moreMenuItemDescriptors.length) {
			const originalHeight = openMoreMenu.offsetHeight;
			const originalWidth = openMoreMenu.offsetWidth;

			const dividerEl = document.createElement('div');
			dividerEl.className = 'J-Kh';
			this._moreMenuAddedElements.push(dividerEl);
			openMoreMenu.appendChild(dividerEl);

			this._moreMenuItemDescriptors.forEach(options => {
				const itemEl = document.createElement('div');
				itemEl.className = 'J-N';
				itemEl.setAttribute('role', 'menuitem');
				itemEl.textContent = options.title;
				(itemEl: any).addEventListener('mouseenter', () => {
					itemEl.classList.add('J-N-JT');
				});
				(itemEl: any).addEventListener('mouseleave', () => {
					itemEl.classList.remove('J-N-JT');
				});
				(itemEl: any).addEventListener('click', () => {
					this._closeActiveEmailMenu();
					options.onClick();
				});

				if (options.iconUrl || options.iconClass) {
					const iconEl = document.createElement('img');
					iconEl.className = `f4 J-N-JX inboxsdk__message_more_icon ${options.iconClass||''}`;
					iconEl.src = options.iconUrl || 'images/cleardot.gif';
					itemEl.insertBefore(iconEl, itemEl.firstChild);
				}

				this._moreMenuAddedElements.push(itemEl);
				openMoreMenu.appendChild(itemEl);
			});

			const menuRect = openMoreMenu.getBoundingClientRect();

			const addedWidth = menuRect.width - originalWidth;
			if (addedWidth > 0) {
				openMoreMenu.style.left = Math.max(
					0, parseInt(openMoreMenu.style.left)-addedWidth) + 'px';
			}

			const moreButton = this._getMoreButton();
			if (moreButton) {
				const moreButtonRect = moreButton.getBoundingClientRect();

				// If the menu is positioned above the button, then adjust the menu
				// upwards to compensate for the buttons we added.
				if (menuRect.top < moreButtonRect.top) {
					const addedHeight = menuRect.height - originalHeight;
					openMoreMenu.style.top = Math.max(
						0, parseInt(openMoreMenu.style.top)-addedHeight) + 'px';
				}
			}
		}
	}

	getMessageID(ignoreLoadStatus=false): string {
		if(!ignoreLoadStatus && !this._messageLoaded){
			throw new Error('tried to get message id before message is loaded');
		}
		const messageEl = this._element.querySelector("div.ii.gt");
		if (!messageEl) {
			const err = new Error("Could not find message id element");
			this._driver.getLogger().error(err, {
				elementHtml: censorHTMLtree(this._element)
			});
			throw err;
		}

		let m = messageEl.className.match(/\bm([0-9a-f]+)\b/);
		if(m){
			if (!hasSeenOldElement) {
				hasSeenOldElement = true;
				this._driver.getLogger().eventSite('old messageid location');
			}
			return m[1];
		}
		else{
			const messageElChild = messageEl.firstElementChild;
			if(!messageElChild){
				const err = new Error("Could not find message id value");
				this._driver.getLogger().error(err, {
					reason: "Could not find element",
					messageHtml: censorHTMLtree(messageEl)
				});
				throw err;
			}
			const m = messageElChild.className.match(/\bm([0-9a-f]+)\b/);
			if (!m) {
				const err = new Error("Could not find message id value");
				this._driver.getLogger().error(err, {
					reason: "Element was missing message className",
					messageHtml: censorHTMLtree(messageEl)
				});
				throw err;
			}
			return m[1];
		}
	}

	addAttachmentIcon(iconDescriptor: Object) {
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

		this._stopper.onValue(() => {
			if (added) {
				getImgElement().remove();
				added = false;
			}
		});

		kefirCast(Kefir, iconDescriptor)
			.takeUntilBy(this._stopper)
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
	}

	getViewState(): VIEW_STATE {
		if(this._element.classList.contains('kQ')){
			return 'HIDDEN';
		}
		else if(this._element.classList.contains('kv')){
			return 'COLLAPSED';
		}
		else{
			return 'EXPANDED';
		}
	}

	hasOpenReply(): boolean {
		return Boolean(this._replyElement);
	}

	_addAttachmentCard(options: Object): GmailAttachmentCardView {
		var gmailAttachmentCardView = new GmailAttachmentCardView(options, this._driver);

		if(!this._gmailAttachmentAreaView){
			this._gmailAttachmentAreaView = this._getAttachmentArea();
		}

		if(!this._gmailAttachmentAreaView){
			this._gmailAttachmentAreaView = this._createAttachmentArea();
		}

		this._gmailAttachmentAreaView.addGmailAttachmentCardView(gmailAttachmentCardView);

		return gmailAttachmentCardView;
	}

	_setupMessageStateStream(){
		var self = this;

		this._eventStream.plug(
			makeMutationObserverStream(this._element, {
				attributes: true, attributeFilter: ['class'], attributeOldValue: true
			}).takeUntilBy(this._stopper)
			  .map(function(mutation) {
				var currentClassList = (mutation.target: any).classList;

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

				return {oldValue, newValue, currentClassList};
			})
			.map(function(event){
				if(event.newValue === 'EXPANDED' && event.oldValue !== 'EXPANDED'){
					self._checkMessageOpenState(event.currentClassList);
				}

				return event;
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
	}

	_processInitialState(){
		this._checkMessageOpenState(this._element.classList);
	}

	_checkMessageOpenState(classList: Object){
		if(!classList.contains('h7')){
			return;
		}

		if(this._messageLoaded){
			return;
		}

		let messageId;
		try {
		 	messageId = this.getMessageID(true);
		} catch(err) {
			this._driver.getLogger().error(err);
			return;
		}

		this._messageLoaded = true;

		this._driver.associateThreadAndMessageIDs(this._threadViewDriver.getThreadID(), messageId);
		this._gmailAttachmentAreaView = this._getAttachmentArea();

		this._eventStream.emit({
			type: 'internal',
			eventName: 'messageLoad'
		});

		this._setupReplyStream();
	}

	_setupReplyStream(){
		var replyContainer = this._element.querySelector('.ip');

		if(!replyContainer){
			return;
		}

		var self = this;
		var currentReplyElementRemovalStream = null;

		makeMutationObserverChunkedStream(
			replyContainer,
			{
				attributes: true, attributeFilter: ['class']
			}
		)
		.merge(delayAsap())
		.takeUntilBy(this._stopper)
		.beforeEnd(() => 'END')
		.onValue(mutation => {
			if (mutation !== 'END' && replyContainer.classList.contains('adB')) {
				if (!currentReplyElementRemovalStream) {
					self._replyElement = replyContainer;

					currentReplyElementRemovalStream = kefirBus();
					self._eventStream.emit({
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
					temp.emit(null);
					temp.end();

					self._replyElement = null;
				}
			}
		});
	}

	_monitorEmailAddressHovering(){
		var self = this;
		this._eventStream.plug(
			Kefir.fromEvents(this._element, 'mouseover')
				 .map(e => e.target)
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
						if((self._element.querySelector('h3.iw'): any).contains(element)){
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
	}

	_getAttachmentArea(): ?GmailAttachmentAreaView {
		if(this._element.querySelector('.hq')){
			return new GmailAttachmentAreaView(this._element.querySelector('.hq'), this._driver);
		}

		return null;
	}

	_createAttachmentArea(): GmailAttachmentAreaView{
		const gmailAttachmentAreaView = new GmailAttachmentAreaView(null, this._driver);

		const beforeElement = this._element.querySelector('.hi');
		const parentNode = beforeElement.parentNode;
		if(!parentNode) throw new Error('parentNode not found');
		parentNode.insertBefore(gmailAttachmentAreaView.getElement(), beforeElement);

		return gmailAttachmentAreaView;
	}

	_getUpdatedContact(inContact: Contact): Contact{
		return getUpdatedContact(inContact, this._element);
	}

	getReadyStream() {
		return Kefir.constant(null);
	}
}

function _extractContactInformation(span){
	return {
		name: span.getAttribute('name'),
		emailAddress: span.getAttribute('email')
	};
}

export default defn(module, GmailMessageView);

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
	const test: MessageViewDriver = new GmailMessageView(({}:any), ({}:any), ({}:any));
}
