/* @flow */

import _ from 'lodash';
import asap from 'asap';
import delay from 'pdelay';
import RSVP from 'rsvp';
import * as Kefir from 'kefir';
import * as ud from 'ud';
import closest from 'closest-ng';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import type {Stopper} from 'kefir-stopper';

import delayAsap from '../../../lib/delay-asap';
import simulateClick from '../../../lib/dom/simulate-click';
import simulateKey from '../../../lib/dom/simulate-key';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import isElementVisible from '../../../../common/isElementVisible';
import {simulateDragOver, simulateDrop, simulateDragEnd} from '../../../lib/dom/simulate-drag-and-drop';
import * as GmailResponseProcessor from '../gmail-response-processor';
import GmailElementGetter from '../gmail-element-getter';
import setCss from '../../../lib/dom/set-css';

import waitFor from '../../../lib/wait-for';
import streamWaitFor from '../../../lib/stream-wait-for';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import handleComposeLinkChips from '../../../lib/handle-compose-link-chips';
import insertLinkChipIntoBody from '../../../lib/insert-link-chip-into-body';
import addStatusBar from './gmail-compose-view/add-status-bar';
import insertHTMLatCursor from '../../../lib/dom/insert-html-at-cursor';
import ensureGroupingIsOpen from './gmail-compose-view/ensure-grouping-is-open';
import sizeFixer from './gmail-compose-view/size-fixer';
import addTooltipToButton from './gmail-compose-view/add-tooltip-to-button';
import addRecipientRow from './gmail-compose-view/add-recipient-row';
import addButton from './gmail-compose-view/add-button';
import monitorSelectionRange from './gmail-compose-view/monitor-selection-range';
import manageButtonGrouping from './gmail-compose-view/manage-button-grouping';
import type {TooltipDescriptor} from '../../../views/compose-button-view';
import {getSelectedHTMLInElement, getSelectedTextInElement} from '../../../lib/dom/get-selection';
import getMinimizedStream from './gmail-compose-view/get-minimized-stream';
import censorHTMLstring from '../../../../common/censor-html-string';

import insertLinkIntoBody from './gmail-compose-view/insert-link-into-body';
import getAddressChangesStream from './gmail-compose-view/get-address-changes-stream';
import getBodyChangesStream from './gmail-compose-view/get-body-changes-stream';
import getRecipients from './gmail-compose-view/get-recipients';
import getPresendingStream from '../../../driver-common/compose/getPresendingStream';
import getDiscardStream from '../../../driver-common/compose/getDiscardStream';
import updateInsertMoreAreaLeft from './gmail-compose-view/update-insert-more-area-left';
import getFormattingAreaOffsetLeft from './gmail-compose-view/get-formatting-area-offset-left';
import overrideEditSubject from './gmail-compose-view/override-edit-subject';

import * as fromManager from './gmail-compose-view/from-manager';

import type {ComposeViewDriver, StatusBar} from '../../../driver-interfaces/compose-view-driver';
import type Logger from '../../../lib/logger';
import type GmailDriver from '../gmail-driver';

let hasReportedMissingBody = false;

class GmailComposeView {
	_element: HTMLElement;
	_seenBodyElement: HTMLElement;
	_isInlineReplyForm: boolean;
	_isFullscreen: boolean;
	_isStandalone: boolean;
	_emailWasSent: boolean;
	_driver: GmailDriver;
	_managedViewControllers: Array<{destroy(): void}>;
	_eventStream: Bus<any>;
	_isTriggeringADraftSavePending: boolean;
	_buttonViewControllerTooltipMap: WeakMap<Object, Object>;
	_composeID: string;
	_messageIDElement: HTMLElement;
	_messageId: ?string;
	_finalMessageId: ?string; // Set only after the message is sent.
	_initialMessageId: ?string;
	_targetMessageID: ?string;
	_draftSaving: boolean;
	_draftIDpromise: ?Promise<?string>;
	_threadID: ?string;
	_stopper: Stopper;
	_lastSelectionRange: ?Range;
	_requestModifiers: {[key: string]: (composeParams: {body: string}) => {body: string} | Promise<{body: string}>};
	_isListeningToAjaxInterceptStream: boolean;
	_formattingArea: ?HTMLElement;
	_destroyed: boolean = false;
	ready: () => Kefir.Observable<GmailComposeView>;
	getEventStream: () => Kefir.Observable<any>;

	constructor(element: HTMLElement, xhrInterceptorStream: Kefir.Observable<*>, driver: GmailDriver, options: {isInlineReplyForm: boolean, isStandalone: boolean}) {
		(this: ComposeViewDriver);
		this._element = element;
		this._element.classList.add('inboxsdk__compose');

		this._isInlineReplyForm = options.isInlineReplyForm;
		this._isStandalone = options.isStandalone;
		this._isFullscreen = false;
		this._emailWasSent = false;
		this._messageId = null;
		this._finalMessageId = null;
		this._draftSaving = false;
		this._draftIDpromise = null;
		this._driver = driver;
		this._stopper = kefirStopper();
		this._managedViewControllers = [];
		this._requestModifiers = {};
		this._isListeningToAjaxInterceptStream = false;

		this._eventStream = kefirBus();

		this._isTriggeringADraftSavePending = false;

		this._eventStream.plug(
			Kefir.merge([
				xhrInterceptorStream
					.filter(event => event.composeId === this.getComposeID())
					.map((event) => {
						switch(event.type){
							case 'emailSending':
								return [{eventName: 'sending'}];

							case 'emailSent':
								var response = GmailResponseProcessor.interpretSentEmailResponse(event.response);
								if(_.includes(['tr','eu'], response.messageID)){
									return [{eventName: 'sendCanceled'}];
								}
								this._emailWasSent = true;
								if(response.messageID){
									this._finalMessageId = response.messageID;
								}
								this._messageId = null;
								return [{eventName: 'sent', data: response}];
							case 'emailDraftSaveSending':
								this._draftSaving = true;
								return [{eventName: 'draftSaving'}];
							case 'emailDraftReceived':
								this._draftSaving = false;
								var response;
								try{
									response = GmailResponseProcessor.interpretSentEmailResponse(event.response);
								}
								catch(err){
									if(this._driver.getAppId() === 'sdk_streak_21e9788951'){
										this._driver.getLogger().error(err, {connectionDetails: event.connectionDetails, response: event.response});
										throw err;
									}
									else{
										throw err;
									}
								}
								if (response.messageID === 'eu') {
									return []; // save was canceled
								}
								const events = [{eventName: 'draftSaved', data: response}];
								if (!response.messageID) {
									this._driver.getLogger().error(new Error("Missing message id from emailDraftReceived"));
								} else if(response.messageID && this._messageId !== response.messageID){
									if (/^[0-9a-f]+$/i.test(response.messageID)) {
										this._messageId = response.messageID;
										events.push({
											eventName: 'messageIDChange',
											data: this._messageId
										});
									} else {
										this._driver.getLogger().error(new Error("Invalid message id from emailDraftReceived"), {
											value: response.messageID
										});
									}
								}
								return events;

							default:
								return [];
						}
					})
					.flatten()
					.map(event => {
						if(this._driver.getLogger().shouldTrackEverything()){
							driver.getLogger().eventSite('compose.debug.xhr', {eventName: event.eventName});
						}

						return event;
					}),

				Kefir
					.fromEvents(this._element, 'buttonAdded')
					.map(() => {
						return {
							eventName: 'buttonAdded'
						};
					}
				),

				Kefir.fromEvents(this._element, 'resize').map(() => ({eventName: 'resize'})),

				Kefir
					.fromEvents(this._element, 'composeFullscreenStateChanged')
					.map(() => {
						this._updateComposeFullscreenState();
						return {
							eventName: 'fullscreenChanged',
							data: {fullscreen: this._isFullscreen}
						};
					})
			])
		);

		this._buttonViewControllerTooltipMap = new WeakMap();

		const initialBodyElement = this.getMaybeBodyElement();
		this.ready = _.constant(
			(
				initialBodyElement ?
					Kefir.constant(initialBodyElement) :
					streamWaitFor(
						() => this.getMaybeBodyElement(),
						3*60 * 1000 //timeout
					)
			)
			.takeUntilBy(this._stopper)
			.map(bodyElement => {
				this._seenBodyElement = bodyElement;

				this._composeID = ((this._element.querySelector('input[name="composeid"]'): any): HTMLInputElement).value;
				this._messageIDElement = (this._element.querySelector('input[name="draft"]'): any);
				if (!this._messageIDElement) {
					driver.getLogger().error(new Error("Could not find compose message id field"));
					// stub so other things don't fail
					this._messageIDElement = document.createElement('div');
				}

				this._setupIDs();

				this._setupStreams();
				this._setupConsistencyCheckers();
				this._updateComposeFullscreenState();

				this.getEventStream()
					.filter(({eventName}) => eventName === 'presending')
					.takeUntilBy(this._stopper)
					.onValue(() => {
						Kefir.later(15).takeUntilBy(
							this.getEventStream().filter(({eventName}) => (
								eventName === 'sendCanceled' ||
								eventName === 'sending'
							))
						).onValue(() => {
							this._eventStream.emit({eventName: 'sendCanceled'});
						});
					});

				return this;
			}).toProperty()
		);

		this.ready().onError(errorObject => {
			driver.getLogger().error(errorObject, {
				hasForm: !!this.getElement().querySelector('form'),
				class: this.getElement().getAttribute('class')
			});
		});
	}

	destroy() {
		this._eventStream.emit({eventName: 'destroy', data: {
			messageID: this.getMessageID()
		}});
		this._eventStream.end();
		this._managedViewControllers.forEach(vc => {
			vc.destroy();
		});
		this._requestModifiers = {};
		this._managedViewControllers.length = 0;
		this._stopper.destroy();
		this._destroyed = true;
	}

	getStopper(): Kefir.Observable<null> {return this._stopper;}

	getEventStream(): Kefir.Observable<Object> {return this._eventStream;}

	isDestroyed(): boolean { return this._destroyed;}

	_setupStreams() {
		this._eventStream.plug(getBodyChangesStream(this));
		this._eventStream.plug(getAddressChangesStream(this));
		this._eventStream.plug(getPresendingStream({
			element: this.getElement(),
			sendButton: this.getSendButton(),
			sendAndArchive: this.getSendAndArchiveButton()
		}));
		this._eventStream.plug(getDiscardStream({
			element: this.getElement(),
			discardButton: this.getDiscardButton()
		}));

		this._eventStream.plug(
			Kefir
				.fromEvents(this.getElement(), 'inboxSDKsendCanceled')
				.map(() => ({eventName: 'sendCanceled'}))
		);

		this._eventStream.plug(
			Kefir
				.later(10)
				.flatMap(()=>getMinimizedStream(this))
				.changes()
				.map(minimized =>
					({eventName: minimized ? 'minimized' : 'restored'})
				)
		);

		const messageIDChangeStream = makeMutationObserverChunkedStream(this._messageIDElement, {attributes:true, attributeFilter:['value']});

		messageIDChangeStream
			.takeUntilBy(this._eventStream.filter(()=>false).beforeEnd(()=>null))
			.map(() => this._getMessageIDfromForm())
			.filter(messageID =>
				messageID && !this._emailWasSent && this._messageId !== messageID
			)
			.onValue(messageID => {
				this._messageId = messageID;
				this._eventStream.emit({
					eventName: 'messageIDChange',
					data: this._messageId
				});
			});
	}

	_setupConsistencyCheckers() {
		try {
			handleComposeLinkChips(this);
			monitorSelectionRange(this);
			manageButtonGrouping(this);
			sizeFixer(this._driver, this);
		} catch(err) {
			this._driver.getLogger().error(err);
		}
	}

	_setupIDs() {
		this._messageId = this._initialMessageId = this._getMessageIDfromForm();
		this._targetMessageID = this._getTargetMessageID();
		this._threadID = this._getThreadID();
	}

	_updateComposeFullscreenState() {
		this._isFullscreen = !this._isInlineReplyForm &&
			(this._isStandalone ||
				(GmailElementGetter.getFullscreenComposeWindowContainer():any).contains(this._element));
	}

	focus() {
		require('./gmail-compose-view/focus')(this);
	}

	insertBodyTextAtCursor(text: string): ?HTMLElement {
		return this.insertBodyHTMLAtCursor(_.escape(text).replace(/\n/g, '<br>'));
	}

	insertBodyHTMLAtCursor(html: string): ?HTMLElement {
		var retVal = insertHTMLatCursor(this.getBodyElement(), html, this._lastSelectionRange);
		this._triggerDraftSave();
		return retVal;
	}

	insertLinkIntoBody(text: string, href: string): ?HTMLElement {
		var retVal = insertLinkIntoBody(this, text, href);

		this._triggerDraftSave();
		return retVal;
	}

	insertLinkChipIntoBody(options: {iconUrl?: string, url: string, text: string}): HTMLElement {
		var retVal = insertLinkChipIntoBody(this, options);
		this._triggerDraftSave();
		return retVal;
	}

	setSubject(text: string) {
		(this._element.querySelector('input[name=subjectbox]'): any).value = text;

		this._triggerDraftSave();
	}

	setBodyHTML(html: string) {
		this.getBodyElement().innerHTML = html;

		this._triggerDraftSave();
	}

	setBodyText(text: string) {
		this.getBodyElement().textContent = text;

		this._triggerDraftSave();
	}

	setToRecipients(emails: string[]) {
		require('./gmail-compose-view/set-recipients')(this, 0, emails);

		this._triggerDraftSave();
	}

	setCcRecipients(emails: string[]) {
		require('./gmail-compose-view/set-recipients')(this, 1, emails);

		this._triggerDraftSave();
	}

	setBccRecipients(emails: string[]) {
		require('./gmail-compose-view/set-recipients')(this, 2, emails);

		this._triggerDraftSave();
	}

	addRecipientRow(options: Kefir.Observable<?Object>): () => void {
		return addRecipientRow(this, options);
	}

	getFromContact() {
		return fromManager.getFromContact(this._driver, this);
	}

	getFromContactChoices() {
		return fromManager.getFromContactChoices(this._driver, this);
	}

	setFromEmail(email: string) {
		fromManager.setFromEmail(this._driver, this, email);
	}

	addButton(buttonDescriptor: Kefir.Observable<?Object>, groupOrderHint: string, extraOnClickOptions: Object): Promise<?Object> {
		return addButton(this, buttonDescriptor, groupOrderHint, extraOnClickOptions);
	}

	addTooltipToButton(buttonViewController: Object, buttonDescriptor: Object, tooltipDescriptor: TooltipDescriptor) {
		var tooltip = addTooltipToButton(this, buttonViewController, buttonDescriptor, tooltipDescriptor);
		this._buttonViewControllerTooltipMap.set(buttonViewController, tooltip);
	}

	closeButtonTooltip(buttonViewController: Object) {
		if(!this._buttonViewControllerTooltipMap){
			return;
		}

		var tooltip = this._buttonViewControllerTooltipMap.get(buttonViewController);
		if(tooltip){
			tooltip.destroy();
			this._buttonViewControllerTooltipMap.delete(buttonViewController);
		}
	}

	addOuterSidebar(options: {title: string, el: HTMLElement}) {
		if(this.isInlineReplyForm()){
			console.warn("Trying to add an outer sidebar to an inline reply which doesn't work.");
			return;
		}

		require('./gmail-compose-view/add-outer-sidebar')(this, options);
	}

	addInnerSidebar(options: {el: HTMLElement}) {
		if(this.isInlineReplyForm()){
			console.warn("Trying to add an inner sidebar to an inline reply which doesn't work.");
			return;
		}

		require('./gmail-compose-view/add-inner-sidebar')(this, options);
	}

	addStatusBar(options: {height?: number, orderHint?: number}={}): StatusBar {
		var statusBar = addStatusBar(this, options);
		this._element.dispatchEvent(new CustomEvent('resize', {
			bubbles: false, cancelable: false, detail: null
		}));
		Kefir.fromEvents(statusBar, 'destroy')
			.map(() => ({eventName:'statusBarRemoved'}))
			.flatMap(delayAsap)
			.takeUntilBy(this._stopper)
			.onValue(() => {
				this._element.dispatchEvent(new CustomEvent('resize', {
					bubbles: false, cancelable: false, detail: null
				}));
			});

		return statusBar;
	}

	close() {
		if(this.isInlineReplyForm()){
			console.warn("Trying to close an inline reply which doesn't work.");
			return;
		}

		if(this._isFullscreen){
			this._eventStream
				.filter(({eventName}) => eventName === 'fullscreenChanged')
				.onValue(() => simulateClick(this.getCloseButton()));

			simulateClick(this.getMoleSwitchButton());
		}
		else{
			simulateClick(this.getCloseButton());
		}
	}

	send() {
		simulateClick(this.getSendButton());
	}

	discard() {
		simulateClick(this.getDiscardButton());
	}

	popOut() {
		if (!this.isInlineReplyForm()) {
			throw new Error("Can only pop out inline reply compose views");
		}
		const popOutBtn = querySelector(this._element, '.M9 > [role=menu]:first-child > .SK > [role=menuitem]:last-child');
		simulateClick(popOutBtn);
	}

	overrideEditSubject() {
		overrideEditSubject(this._driver, this);
	}

	_hideDropzones() {
		setCss('compose dropzone hider', 'body > .aC7 .aC9 {visibility: hidden;}')
	}

	_reenableDropzones() {
		setCss('compose dropzone hider', null);
	}

	_dropzonesVisible(): boolean {
		return _.filter(document.querySelectorAll('body > .aC7:not(.aWP)'), isElementVisible).length > 0;
	}

	_findDropzoneForThisCompose(inline: boolean): HTMLElement {
		// Iterate through all the dropzones and find the one visually contained by
		// this compose.
		const rect = this._element.getBoundingClientRect();
		const dropzoneSelector = inline ? 'body > .aC7:not(.aWP)' : 'body > .aC7.aWP';
		const el = _.chain(document.querySelectorAll(dropzoneSelector))
			.filter(isElementVisible)
			.filter(dropzone => {
				const top = parseInt(dropzone.style.top, 10);
				const bottom = top + parseInt(dropzone.style.height, 10);
				const left = parseInt(dropzone.style.left, 10);
				const right = left + parseInt(dropzone.style.width, 10);
				return top >= rect.top && left >= rect.left &&
					right <= rect.right && bottom <= rect.bottom;
			})
			.head()
			.value();
		if (!el) {
			throw new Error("Failed to find dropzone");
		}
		return el;
	}

	async _attachFiles(files: Blob[], inline: boolean): Promise<void> {
		this._hideDropzones();
		const endDrag = _.once(() => simulateDragEnd(this._element, files));
		try {
			let firstLoop = true;
			for (let files of _.chunk(files, 3)) {
				if (firstLoop) {
					firstLoop = false;
				} else {
					await delay(500);
				}

				simulateDragOver(this._element, files);
				await waitFor(() => this._dropzonesVisible(), 20*1000);
				const dropzone = this._findDropzoneForThisCompose(inline);
				simulateDrop(dropzone, files);
				endDrag();
				await waitFor(() => !this._dropzonesVisible(), 20*1000);
			}
		} catch (err) {
			this._driver.getLogger().error(err);
		} finally {
			endDrag();
			this._reenableDropzones();
		}
	}

	attachFiles(files: Blob[]): Promise<void> {
		return this._attachFiles(files, false);
	}

	attachInlineFiles(files: Blob[]): Promise<void> {
		return this._attachFiles(files, true);
	}

	isReply(): boolean {
		return this._isInlineReplyForm || !!this._element.querySelector('.HQ');
	}

	isInlineReplyForm(): boolean {
		return this._isInlineReplyForm;
	}

	getBodyElement(): HTMLElement {
		const el = this.getMaybeBodyElement();
		if (!el) throw new Error('Could not find body element');
		return el;
	}

	getMaybeBodyElement(): ?HTMLElement {
		return this._element.querySelector('.Ap [g_editable=true]');
	}

	getTopFormElement(): HTMLElement {
		return querySelector(this._element, 'td > form');
	}

	getHTMLContent(): string {
		return this.getBodyElement().innerHTML;
	}

	getTextContent(): string {
		return this.getBodyElement().textContent;
	}

	getSelectedBodyHTML(): ?string {
		return getSelectedHTMLInElement(this.getBodyElement(), this._lastSelectionRange);
	}

	getSelectedBodyText(): ?string {
		return getSelectedTextInElement(this.getBodyElement(), this._lastSelectionRange);
	}

	getSubject(): string {
		return this.getSubjectInput().value;
	}

	getSubjectInput(): HTMLInputElement {
		return (this._element: any).querySelector('input[name=subjectbox]');
	}

	getToRecipients(): Contact[] {
		return getRecipients(this, 0, "to");
	}

	getCcRecipients(): Contact[] {
		return getRecipients(this, 1, "cc");
	}

	getBccRecipients(): Contact[] {
		return getRecipients(this, 2, "bcc");
	}

	getAdditionalActionToolbar(): HTMLElement {
		return require('./gmail-compose-view/get-additional-action-toolbar')(this);
	}

	updateInsertMoreAreaLeft(oldFormattingAreaOffsetLeft: number) {
		updateInsertMoreAreaLeft(this, oldFormattingAreaOffsetLeft);
	}

	_getFormattingAreaOffsetLeft(): number {
		return getFormattingAreaOffsetLeft(this);
	}

	getFormattingArea(): ?HTMLElement {
		let formattingArea = this._formattingArea;
		if(!formattingArea){
			formattingArea = this._formattingArea = this._element.querySelector('.oc');
		}
		return formattingArea;
	}

	getFormattingToolbar(): ?HTMLElement {
		return this._element.querySelector('.aX');
	}

	getFormattingToolbarArrow(): HTMLElement {
		const el = this.getFormattingToolbar();
		if (!el) throw new Error('Failed to find formatting toolbar');
		return querySelector(el, '.aA4');
	}

	getFormattingToolbarToggleButton(): HTMLElement {
		const innerElement = querySelector(this._element, '[role=button] .dv');
		const btn = closest(innerElement, '[role=button]');
		if (!btn) throw new Error('failed to find button');
		return btn;
	}

	getScrollBody(): HTMLElement {
		var scrollBody = this._element.querySelector('table .GP');
		if (!scrollBody) {
			throw new Error("Failed to find scroll body");
		}
		return scrollBody;
	}

	getStatusArea(): HTMLElement {
		var statusArea = this._element.querySelector('.aDg .aDj > .aDh');
		if (!statusArea) {
			throw new Error("Failed to find status area");
		}
		return statusArea;
	}

	getInsertMoreArea(): HTMLElement {
		return querySelector(this._element, '.eq');
	}

	getInsertLinkButton(): HTMLElement {
		return querySelector(this._element, '.e5.aaA.aMZ');
	}

	getSendButton(): HTMLElement {
		return querySelector(this._element, '.IZ .Up > div > [role=button]');
	}

	getSendAndArchiveButton(): ?HTMLElement {
		if(!this.isReply()){
			return null;
		}

		const sendButton = this.getSendButton();
		const parent = sendButton.parentElement;
		if (!(parent instanceof HTMLElement)) throw new Error('should not happen');
		if(parent.childElementCount <= 1){
			return null;
		}

		const firstNotSendElement =
			parent.children[0] !== sendButton ? parent.children[0] : parent.children[1];
		return !firstNotSendElement ? null : firstNotSendElement.querySelector('[role=button]');
	}

	getCloseButton(): HTMLElement {
		return this._element.querySelectorAll('.Hm > img')[2];
	}

	getMoleSwitchButton(): HTMLElement {
		return this._element.querySelectorAll('.Hm > img')[1];
	}

	getBottomBarTable(): HTMLElement {
		return querySelector(this._element, '.aoP .aDh > table');
	}

	getBottomToolbarContainer(): HTMLElement {
		return querySelector(this._element, '.aoP .aDj');
	}

	getDiscardButton(): HTMLElement {
		return querySelector(this._element, '.gU.az5 .oh');
	}

	getComposeID(): string {
		return this._composeID;
	}

	getInitialMessageID(): ?string {
		return this._initialMessageId;
	}

	_getMessageIDfromForm(): ?string {
		const value = this._messageIDElement && this._messageIDElement.value || null;
		if (typeof value === 'string' && value !== 'undefined' && value !== 'null') {
			if (/^[0-9a-f]+$/i.test(value)) {
				return value;
			} else {
				this._driver.getLogger().error(new Error("Invalid message id in element"), {
					value
				});
			}
		}
		return null;
	}

	getMessageID(): ?string {
		return this._messageId;
	}

	getTargetMessageID(): ?string {
		return this._targetMessageID;
	}

	getThreadID(): ?string {
		return this._threadID;
	}

	async getCurrentDraftID(): Promise<?string> {
		if (!this.getMessageID()) {
			return null;
		} else {
			return this.getDraftID();
		}
	}

	getDraftID(): Promise<?string> {
		let draftIDpromise = this._draftIDpromise;
		if (!draftIDpromise) {
			draftIDpromise = this._draftIDpromise = this._getDraftIDimplementation();
		}
		return draftIDpromise;
	}

	async _getDraftIDimplementation(): Promise<?string> {
		let i = -1;

		try {
			// If this compose view doesn't have a message id yet, wait until it gets
			// one or it's closed.
			if (!this._messageId) {
				await this._eventStream
					.filter(event => event.eventName === 'messageIDChange')
					.beforeEnd(() => null)
					.take(1)
					.toPromise();

				if (!this._messageId) {
					// The compose was closed before it got an id.
					return null;
				}
			}

			// We make an AJAX request against gmail to find the draft ID for our
			// current message ID. However, our message ID can change before that
			// request finishes. If we fail to get our draft ID and we see that our
			// message ID has changed since we made the request, then we try again.
			let lastMessageId = null;
			while (true) {
				i++;

				const messageId = this._messageId;
				if (!messageId) {
					throw new Error('Should not happen');
				}
				if (lastMessageId === messageId) {
					// It's possible that the server received a draft save request from us
					// already, causing the draft id lookup to fail, but we haven't gotten
					// the draft save response yet. Wait for that response to finish and
					// keep trying if it looks like that might be the case.
					if (this._draftSaving) {
						await this._eventStream
							.filter(event => event.eventName === 'messageIDChange')
							.beforeEnd(() => null)
							.take(1)
							.toPromise();
						continue;
					}
					throw new Error("Failed to read draft ID");
				}
				lastMessageId = messageId;

				const draftID = await this._driver.getDraftIDForMessageID(messageId);
				if (draftID) {
					return draftID;
				}
			}
		} catch(err) {
			this._driver.getLogger().error(err, {
				message: 'getDraftID error',
				i
			});
			throw err;
		}
	}

	getRecipientRowElements(): HTMLElement[] {
		return _.filter(this._element.querySelectorAll('.GS tr'), (tr) => !tr.classList.contains('inboxsdk__recipient_row'));
	}

	addManagedViewController(viewController: {destroy(): void}) {
		this._managedViewControllers.push(viewController);
	}

	ensureGroupingIsOpen(type: string) {
		ensureGroupingIsOpen(this._element, type);
	}

	isMinimized(): boolean {
		const element = this.getElement();
		const bodyElement = this.getMaybeBodyElement();
		const bodyContainer = _.find(element.children, child => child.contains(bodyElement));
		if (!bodyContainer) {
			if (!hasReportedMissingBody) {
				hasReportedMissingBody = true;
				this._driver.getLogger().error(
					new Error("isMinimized failed to find bodyContainer"),
					{
						bodyElement: !!bodyElement,
						hasMessageIDElement: !!this._messageIDElement,
						ended: (this._eventStream:any).ended,
						bodyElStillInCompose: this._element.contains(this._seenBodyElement),
						seenBodyElHtml: censorHTMLstring(this._seenBodyElement.outerHTML),
						composeHtml: censorHTMLstring(element.outerHTML)
					}
				);
			}
			return false;
		}

		return bodyContainer.style.display !== '';
	}

	setMinimized(minimized: boolean) {
		if (minimized !== this.isMinimized()) {
			if (this._isInlineReplyForm)
				throw new Error("Not implemented for inline compose views");
			const minimizeButton = querySelector(this._element, '.Hm > img');
			simulateClick(minimizeButton);
		}
	}

	setFullscreen(fullscreen: boolean) {
		if (fullscreen !== this.isFullscreen()) {
			if (this._isInlineReplyForm)
				throw new Error("Not implemented for inline compose views");
			const fullscreenButton = querySelector(this._element, '.Hm > img:nth-of-type(2)');
			simulateClick(fullscreenButton);
		}
	}

	_triggerDraftSave() {
		if(this._isTriggeringADraftSavePending){
			return;
		}
		else{
			this._isTriggeringADraftSavePending = true;

			// Done asynchronously with setTimeout because if it's done synchronously
			// or after an asap step after an inline compose view's creation, Gmail
			// interprets the fake keypress and decides to add a '¾' character.
			Kefir.later(0)
				.takeUntilBy(this._stopper)
				.onValue(() => {
					this._isTriggeringADraftSavePending = false;

					const body = this.getMaybeBodyElement();
					if(body){
						const unsilence = this._driver.getPageCommunicator().silenceGmailErrorsForAMoment();
						try {
							simulateKey(body, 190, 0);
						} finally {
							unsilence();
						}
					}
				});
		}
	}

	// If this compose is a reply, then this gets the message ID of the message
	// we're replying to.
	_getTargetMessageID(): ?string {
		const input = this._element.querySelector('input[name="rm"]');
		return input && typeof input.value === 'string' && input.value != 'undefined' ? input.value : null;
	}

	_getThreadID(): ?string {
		const targetID = this.getTargetMessageID();
		try {
			return targetID ? this._driver.getThreadIDForMessageID(targetID) : null;
		} catch(err) {
			this._driver.getLogger().error(err);
			return null;
		}
	}

	getElement(): HTMLElement {
		return this._element;
	}

	isFullscreen(): boolean {
		return this._isFullscreen;
	}

	getLastSelectionRange(): ?Range {
		return this._lastSelectionRange;
	}

	setLastSelectionRange(lastSelectionRange: ?Range) {
		this._lastSelectionRange = lastSelectionRange;
	}

	registerRequestModifier(modifier: (composeParams: {body: string}) => {body: string} | Promise<{body: string}>){
		const modifierId = this._driver.getPageCommunicator().registerComposeRequestModifier(this.getComposeID(), this._driver.getAppId());
		this._requestModifiers[modifierId] = modifier;
		this._startListeningForModificationRequests();
	}

	_startListeningForModificationRequests(){
		if(this._isListeningToAjaxInterceptStream){
			return;
		}

		this._driver
			.getPageCommunicator()
			.ajaxInterceptStream
			.filter(({type, composeid, modifierId}) =>
						type === 'inboxSDKmodifyComposeRequest' &&
						composeid === this.getComposeID() &&
						Boolean(this._requestModifiers[modifierId])
			)
			.takeUntilBy(this._stopper)
			.onValue(({composeid, modifierId, composeParams}) => {

				if(this._driver.getLogger().shouldTrackEverything()){
					this._driver.getLogger().eventSite('inboxSDKmodifyComposeRequest');
				}

				const modifier = this._requestModifiers[modifierId];
				const result = new Promise(resolve => resolve(modifier(composeParams)));

				result.then(newComposeParams => this._driver.getPageCommunicator().modifyComposeRequest(composeid, modifierId, newComposeParams || composeParams))
							.then(x => {
								if(this._driver.getLogger().shouldTrackEverything()){
									this._driver.getLogger().eventSite('composeRequestModified');
								}
								return x;
							})
						.catch((err) => {
							this._driver.getPageCommunicator().modifyComposeRequest(composeid, modifierId, composeParams)
							 this._driver.getLogger().error(err);
						});
			});

		this._isListeningToAjaxInterceptStream = true;

	}
}
export default ud.defn(module, GmailComposeView);
