/* @flow */

import sortBy from 'lodash/sortBy';
import once from 'lodash/once';
import autoHtml from 'auto-html';
import asap from 'asap';
import {defn} from 'ud';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import kefirCast from 'kefir-cast';

import GmailAttachmentAreaView from './gmail-attachment-area-view';
import GmailAttachmentCardView from './gmail-attachment-card-view';

import getUpdatedContact from './gmail-message-view/get-updated-contact';

import delayAsap from '../../../lib/delay-asap';
import waitFor from '../../../lib/wait-for';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import type {ElementWithLifetime} from '../../../lib/dom/make-element-child-stream';
import {simulateClick} from '../../../lib/dom/simulate-mouse-event';

import censorHTMLtree from '../../../../common/censor-html-tree';
import findParent from '../../../../common/find-parent';

import type GmailDriver from '../gmail-driver';
import type GmailThreadView from './gmail-thread-view';
import type GmailToolbarView from './gmail-toolbar-view';

import type {MessageViewDriver, VIEW_STATE} from '../../../driver-interfaces/message-view-driver';

let hasSeenOldElement = false;

class GmailMessageView {
	_element: HTMLElement;
	_driver: GmailDriver;
	_eventStream: Bus<any> = kefirBus();
	_stopper = kefirStopper();
	_threadViewDriver: GmailThreadView;
	_moreMenuItemDescriptors: Array<Object>;
	_moreMenuAddedElements: Array<HTMLElement>;
	_replyElementStream: Kefir.Observable<ElementWithLifetime>;
	_replyElement: ?HTMLElement;
	_gmailAttachmentAreaView: ?GmailAttachmentAreaView;
	_messageLoaded: boolean = false;
	_openMoreMenu: ?HTMLElement;
	_sender: ?Contact = null;
	_recipients: ?Contact[] = null;

	constructor(element: HTMLElement, gmailThreadView: GmailThreadView, driver: GmailDriver){
		this._element = element;

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

	getEventStream(): Kefir.Observable<Object> {
		return this._eventStream;
	}

	getReplyElementStream(): Kefir.Observable<ElementWithLifetime> {
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

		try {
			return querySelector(this._element, 'div.ii.gt');
		} catch(err) {
			// Keep old fallback selector until we're confident of the new one.
			this._driver.getLogger().error(err);
			return querySelector(this._element, '.adP');
		}
	}

	isElementInQuotedArea(element: HTMLElement): boolean {
		return findParent(element, el => el.nodeName === 'BLOCKQUOTE') != null;
	}

	getSender(): Contact {
		let sender = this._sender;
		if(sender) return sender;

		const senderSpan = querySelector(this._element, 'h3.iw span[email]');

		const emailAddress = senderSpan.getAttribute('email');
		if (!emailAddress) throw new Error('Could not find email address');

		sender = this._sender = this._getUpdatedContact({
			name: senderSpan.getAttribute('name'),
			emailAddress
		});

		return sender;
	}

	getRecipients(): Array<Contact> {
		let recipients = this._recipients;
		if(recipients) return recipients;
		const receipientSpans = Array.from(this._element.querySelectorAll('.hb span[email]'));
		recipients = this._recipients = receipientSpans.map(span => {
			return this._getUpdatedContact({
				name: span.getAttribute('name'),
				emailAddress: span.getAttribute('email') || ''
			});
		});

		return recipients;
	}

	getDateString(): string {
		return querySelector(this._element, '.ads .gK .g3').title;
	}

	async getDate(): Promise<?number> {
		const threadID = this._threadViewDriver.getInternalID();
		return await this._driver.getPageCommunicator().getMessageDate(threadID, this._element);
	}

	getAttachmentCardViewDrivers() {
		if(!this._gmailAttachmentAreaView){
			return [];
		}

		return this._gmailAttachmentAreaView.getAttachmentCardViews();
	}

	addButtonToDownloadAllArea(options: Object ){
		var gmailAttachmentAreaView = this._getAttachmentArea();

		if(!gmailAttachmentAreaView){
			return;
		}

		gmailAttachmentAreaView.addButtonToDownloadAllArea(options);
	}

	addMoreMenuItem(options: Object) {
		this._moreMenuItemDescriptors = sortBy(
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

	_getOpenMoreMenu(): ?HTMLElement {
		// This will find any message's open more menu! The caller needs to make
		// sure it belongs to this message!
		return ((document.body:any):HTMLElement).querySelector('td > div.nH.if > div.nH.aHU div.b7.J-M[aria-haspopup=true]');
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
				itemEl.innerHTML = autoHtml `<div class="J-N-Jz">${options.title}</div>`;

				itemEl.addEventListener('mouseenter', (event: MouseEvent) => itemEl.classList.add('J-N-JT'));
				itemEl.addEventListener('mouseleave', (event: MouseEvent) => itemEl.classList.remove('J-N-JT'));
				itemEl.addEventListener('click', (event: MouseEvent) => {
					this._closeActiveEmailMenu();
					options.onClick();
				});


				if (options.iconUrl || options.iconClass) {
					const iconEl = document.createElement('img');
					iconEl.className = `f4 J-N-JX inboxsdk__message_more_icon ${options.iconClass||''}`;
					iconEl.src = options.iconUrl || 'images/cleardot.gif';

					const insertionPoint = itemEl.firstElementChild;
					if (insertionPoint) insertionPoint.appendChild(iconEl);
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

		const messageIdElement = this._element.querySelector('[data-legacy-message-id]');
		if(messageIdElement){
			const messageId = messageIdElement.getAttribute('data-legacy-message-id');
			if(!messageId) throw new Error('message id attribute with no value, wtf?');
			return messageId;
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

	async getMessageIDAsync(): Promise<string> {
		if(this._driver.isUsingSyncAPI()){
			// handle the case that the data-message-id is available, but the data-legacy-message-id is not
			// this happens when you're looking at a thread, and then you reply to a message, the message id is generated
			// client side, so the new message added (from your reply) shows up in the UI right away and has a data-message-id but
			// because it hasn't been synced to the server it does not have a data-legacy-messag-id
			// so we wait until the message has been synced to the server before saying this is ready
			const messageIdElement = this._element.querySelector('[data-message-id]');
			if(messageIdElement){
				if(messageIdElement.hasAttribute('data-legacy-message-id')){
					return messageIdElement.getAttribute('data-legacy-message-id');
				}
				else {
					// we have a data message id, but not the legacy message id. So now we have to poll for the gmail message id
					return waitFor(
						() => (
							this._driver
									.getGmailMessageIdForSyncMessageId(messageIdElement.getAttribute('data-message-id'))
									.catch(() => null)
						)
					);
				}
			}
			else {
				return this.getMessageID();
			}
		}
		else {
			return this.getMessageID();
		}
	}

	addAttachmentIcon(iconDescriptor: Object) {
		if (!this._element) {
			console.warn('addDateIcon called on destroyed message'); //eslint-disable-line no-console
			return;
		}

		const getImgElement = once(() => {
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

		kefirCast((Kefir: any), iconDescriptor)
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

					const attachmentDiv = querySelector(this._element, 'td.gH div.gK span');
					if (!attachmentDiv.contains(img)) {
						attachmentDiv.appendChild(img);
						added = true;
					}
				}
			});
	}

	getViewState(): VIEW_STATE {
		if(this._element.classList.contains('kQ') || this._element.classList.contains('kx')){
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

	addAttachmentCard(options: Object) {
		var gmailAttachmentCardView = new GmailAttachmentCardView(options, this._driver, this);

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
				const currentClassList = (mutation.target: any).classList;
				const mutationOldValue: string = (mutation.oldValue: any);

				let oldValue;
				let newValue;

				if(mutationOldValue.indexOf('kQ') > -1){
					oldValue = 'HIDDEN';
				}
				else if(mutationOldValue.indexOf('kv') > -1 || mutationOldValue.indexOf('ky') > -1){
					oldValue = 'COLLAPSED';
				}
				else if(mutationOldValue.indexOf('h7') > -1){
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

	async _checkMessageOpenState(classList: Object){
		if(!classList.contains('h7')){
			return;
		}

		if(this._messageLoaded){
			return;
		}

		let messageId;
		try {
			messageId = await this.getMessageIDAsync();
		} catch(err) {
			this._driver.getLogger().error(err);
			return;
		}

		this._messageLoaded = true;

		try {
			this._driver.associateThreadAndMessageIDs(this._threadViewDriver.getThreadID(), messageId);
		} catch (err) {
			this._driver.getLogger().error(err);
		}
		this._gmailAttachmentAreaView = this._getAttachmentArea();

		this._eventStream.emit({
			type: 'internal',
			eventName: 'messageLoad'
		});

		this._setupReplyStream();
	}

	_setupReplyStream(){
		const replyContainer = this._element.querySelector('.ip');

		if(!replyContainer){
			return;
		}

		var self = this;
		var currentReplyElementRemovalStream = null;

		// hold off on emitting the mutation for a millisecond so
		// that compose-view-driver-stream is listening to reply stream
		Kefir.combine([
			makeMutationObserverChunkedStream(
				replyContainer,
				{
					attributes: true, attributeFilter: ['class']
				}
			),
			Kefir.later(1, null)
		])
		.merge(Kefir.later(1))
		.takeUntilBy(this._stopper)
		.beforeEnd(() => 'END')
		.onValue(mutation => {
			if (mutation !== 'END' && replyContainer.classList.contains('adB')) {
				if (!currentReplyElementRemovalStream) {
					const replyElement = replyContainer.firstElementChild;
					self._replyElement = (replyElement: any);

					if(replyElement){
						currentReplyElementRemovalStream = kefirBus();
						self._eventStream.emit({
							type: 'internal',
							eventName: 'replyElement',
							change: {
								el: replyElement, removalStream: currentReplyElementRemovalStream
							}
						});
					}
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
					let addressInformation = self._getUpdatedContact(_extractContactInformation(element));

					let contactType = null;

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
			return new GmailAttachmentAreaView(this._element.querySelector('.hq'), this._driver, this);
		}

		return null;
	}

	_createAttachmentArea(): GmailAttachmentAreaView{
		const gmailAttachmentAreaView = new GmailAttachmentAreaView(null, this._driver, this);

		const beforeElement = querySelector(this._element, '.hi');
		const parentNode = beforeElement.parentNode;
		if(!parentNode) throw new Error('parentNode not found');
		parentNode.insertBefore(gmailAttachmentAreaView.getElement(), beforeElement);

		return gmailAttachmentAreaView;
	}

	_getUpdatedContact(inContact: Contact): Contact{
		return getUpdatedContact(inContact, this._element);
	}

	getReadyStream() {
		return Kefir.fromPromise(this.getMessageIDAsync());
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
