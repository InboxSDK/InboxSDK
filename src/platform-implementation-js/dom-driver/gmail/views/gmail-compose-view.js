/* @flow */
//jshint ignore:start

import _ from 'lodash';
import $ from 'jquery';
import asap from 'asap';
import RSVP from 'rsvp';
import * as Bacon from 'baconjs';
import * as Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';

import delayAsap from '../../../lib/delay-asap';
import simulateClick from '../../../lib/dom/simulate-click';
import simulateKey from '../../../lib/dom/simulate-key';
import * as GmailResponseProcessor from '../gmail-response-processor';
import GmailElementGetter from '../gmail-element-getter';

import kefirWaitFor from '../../../lib/kefir-wait-for';
import dispatchCustomEvent from '../../../lib/dom/dispatch-custom-event';

import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import addStatusBar from './gmail-compose-view/add-status-bar';
import insertHTMLatCursor from '../../../lib/dom/insert-html-at-cursor';
import ensureGroupingIsOpen from './gmail-compose-view/ensure-grouping-is-open';
import sizeFixer from './gmail-compose-view/size-fixer';
import addTooltipToButton from './gmail-compose-view/add-tooltip-to-button';
import addRecipientRow from './gmail-compose-view/add-recipient-row';
import addButton from './gmail-compose-view/add-button';
import monitorSelectionRange from './gmail-compose-view/monitor-selection-range';
import manageButtonGrouping from './gmail-compose-view/manage-button-grouping';
import type {TooltipDescriptor, TooltipButtonDescriptor} from './gmail-compose-view/add-tooltip-to-button';

import * as fromManager from './gmail-compose-view/from-manager';

import type {ComposeViewDriver, StatusBar} from '../../../driver-interfaces/compose-view-driver';
import type Logger from '../../../lib/logger';
import type GmailDriver from '../gmail-driver';

export default class GmailComposeView {
	_element: HTMLElement;
	_isInlineReplyForm: boolean;
	_isFullscreen: boolean;
	_isStandalone: boolean;
	_driver: GmailDriver;
	_managedViewControllers: Array<{destroy: () => void}>;
	_eventStream: Bacon.Bus;
	_isTriggeringADraftSavePending: boolean;
	_buttonViewControllerTooltipMap: WeakMap<Object, Object>;
	_composeID: string;
	_messageIDElement: HTMLElement;
	_messageId: ?string;
	_initialMessageId: ?string;
	_targetMessageID: ?string;
	_threadID: ?string;
	_stopper: Kefir.Stream&{destroy:()=>void};
	_lastSelectionRange: ?Object;
	ready: () => Kefir.Stream<GmailComposeView>;
	getEventStream: () => Kefir.Stream;

	constructor(element: HTMLElement, xhrInterceptorStream: Bacon.Observable, driver: GmailDriver) {
		this._element = element;
		this._element.classList.add('inboxsdk__compose');

		this._isInlineReplyForm = false;
		this._isFullscreen = false;
		this._isStandalone = false;
		this._driver = driver;
		this._stopper = kefirStopper();
		this._managedViewControllers = [];
		this._eventStream = new Bacon.Bus();
		this.getEventStream = _.constant(kefirCast(Kefir, this._eventStream));

		this._isTriggeringADraftSavePending = false;

		this._eventStream.plug(
			Bacon.mergeAll(
				xhrInterceptorStream.filter((event) => {
					return event.type === 'emailSending' && event.composeId === this.getComposeID();
				}).map((event) => {
					return {eventName: 'sending'};
				}),
				xhrInterceptorStream.filter((event) => {
					return event.type === 'emailSent' && event.composeId === this.getComposeID();
				}).map((event) => {
					var response = GmailResponseProcessor.interpretSentEmailResponse(event.response);
					return {eventName: 'sent', data: response};
				}),
				Bacon.fromEventTarget(this._element, 'buttonAdded').map(() => {
					return {
						eventName: 'buttonAdded'
					};
				}),
				Bacon.fromEvent(this._element, 'resize').map(() => ({eventName: 'resize'})),
				Bacon
					.fromEventTarget(this._element, 'composeFullscreenStateChanged')
					.doAction(() => this._updateComposeFullscreenState())
					.map(() => {
						return {
							eventName: 'composeFullscreenStateChanged'
						};
					})
			)
		);

		this._buttonViewControllerTooltipMap = new WeakMap();

		this.ready = _.constant(
			kefirWaitFor(
				() => !this._element || !!this.getBodyElement(),
				3*60 * 1000 //timeout
			).filter(() => !!this._element)
			.map(() => {
				this._composeID = ((this._element.querySelector('input[name="composeid"]'): any): HTMLInputElement).value;
				this._messageIDElement = this._element.querySelector('input[name="draft"]');
				if (!this._messageIDElement) {
					driver.getLogger().error(new Error("Could not find compose message id field"));
					// stub so other things don't fail
					this._messageIDElement = document.createElement('div');
				}

				this._setupIDs();

				this._setupStreams();
				this._setupConsistencyCheckers();
				this._updateComposeFullscreenState();

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
		this._eventStream.end();
		this._managedViewControllers.forEach(vc => {
			vc.destroy();
		});
		this._stopper.destroy();
	}

	getStopper(): Kefir.Stream {return this._stopper;}

	_setupStreams() {
		this._eventStream.plug(require('./gmail-compose-view/get-body-changes-stream')(this));
		this._eventStream.plug(require('./gmail-compose-view/get-address-changes-stream')(this));
		this._eventStream.plug(require('./gmail-compose-view/get-presending-stream')(this));
		this._eventStream.plug(Bacon.later(10).flatMap(()=>require('./gmail-compose-view/get-minimize-restore-stream')(this)));


		var messageIDChangeStream = makeMutationObserverChunkedStream(this._messageIDElement, {attributes:true, attributeFilter:['value']});
		this._eventStream.plug(
			messageIDChangeStream
				.map(() => ({
					eventName: 'messageIDChange',
					data: this.getMessageID()
				}))
		);

		messageIDChangeStream
			.takeUntil(this._eventStream.filter(()=>false).mapEnd(()=>null))
			.map(() => this.getMessageID())
			.onValue(messageID => {
				this._messageId = messageID;
			});
	}

	_setupConsistencyCheckers() {
		try {
			require('./gmail-compose-view/ensure-link-chips-work')(this);
			monitorSelectionRange(this);
			manageButtonGrouping(this);
			sizeFixer(this._driver, this);
		} catch(err) {
			this._driver.getLogger().error(err);
		}
	}

	_setupIDs() {
		this._initialMessageId = this.getMessageID();
		this._messageId = this._initialMessageId;
		this._targetMessageID = this._getTargetMessageID();
		this._threadID = this._getThreadID();
	}

	_updateComposeFullscreenState() {
		this._isFullscreen = !this._isInlineReplyForm &&
			(this._isStandalone ||
				GmailElementGetter.getFullscreenComposeWindowContainer().contains(this._element));
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
		var retVal = require('./gmail-compose-view/insert-link-into-body')(this, text, href);

		this._triggerDraftSave();
		return retVal;
	}

	insertLinkChipIntoBody(options: {iconUrl?: string, url: string, text: string}): HTMLElement {
		var retVal = require('./gmail-compose-view/insert-link-chip-into-body')(this, options);

		this._triggerDraftSave();
		return retVal;
	}

	setSubject(text: string) {
		$(this._element).find('input[name=subjectbox]').val(text);
		$(this._element).find('input[type=hidden][name=subjectbox]').val(text);

		this._triggerDraftSave();
	}

	setBodyHTML(html: string) {
		this.getBodyElement().innerHTML = html;
		$(this._element).find('input[type=hidden][name=body]').val(html);

		this._triggerDraftSave();
	}

	setBodyText(text: string) {
		this.getBodyElement().textContent = text;
		$(this._element).find('input[type=hidden][name=body]').val(text);

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

	addRecipientRow(options: Kefir.Stream): () => void {
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

	addButton(buttonDescriptor: Kefir.Stream, groupOrderHint: string, extraOnClickOptions?: Object): Promise<?Object> {
		return addButton(this, buttonDescriptor, groupOrderHint, extraOnClickOptions);
	}

	addTooltipToButton(buttonViewController: Object, buttonDescriptor: TooltipButtonDescriptor, tooltipDescriptor: TooltipDescriptor) {
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
		dispatchCustomEvent(this._element, 'resize');
		Bacon.fromEvent(statusBar, 'destroy')
			.map(() => ({eventName:'statusBarRemoved'}))
			.flatMap(delayAsap)
			.takeUntil(this._eventStream.filter(()=>false).mapEnd(()=>null))
			.onValue(() => {
				dispatchCustomEvent(this._element, 'resize');
			});
		return statusBar;
	}

	close() {
		if(this.isInlineReplyForm()){
			console.warn("Trying to close an inline reply which doesn't work.");
			return;
		}

		simulateClick(this.getCloseButton());
	}

	send() {
		simulateClick(this.getSendButton());
	}

	isReply(): boolean {
		return this._isInlineReplyForm || !!this._element.querySelector('.HQ');
	}

	isInlineReplyForm(): boolean {
		return this._isInlineReplyForm;
	}

	getBodyElement(): HTMLElement {
		return this._element.querySelector('.Ap [g_editable=true]');
	}

	getTopFormElement(): HTMLElement {
		return this._element.querySelector('td > form');
	}

	getHTMLContent(): string {
		return this.getBodyElement().innerHTML;
	}

	getTextContent(): string {
		return this.getBodyElement().textContent;
	}

	getSelectedBodyHTML(): ?string {
		this.focus();
		return require('../../../lib/dom/get-selected-html')(this.getBodyElement(), this._lastSelectionRange);
	}

	getSelectedBodyText(): ?string {
		this.focus();
		return require('../../../lib/dom/get-selected-text')(this.getBodyElement(), this._lastSelectionRange);
	}

	getSubject(): string {
		return $(this._element).find('input[name=subjectbox]').val();
	}

	getToRecipients(): Contact[] {
		return require('./gmail-compose-view/get-recipients')(this, 0, "to");
	}

	getCcRecipients(): Contact[] {
		return require('./gmail-compose-view/get-recipients')(this, 1, "cc");
	}

	getBccRecipients(): Contact[] {
		return require('./gmail-compose-view/get-recipients')(this, 2, "bcc");
	}

	getAdditionalActionToolbar(): HTMLElement {
		return require('./gmail-compose-view/get-additional-action-toolbar')(this);
	}

	updateInsertMoreAreaLeft(oldFormattingAreaOffsetLeft: number) {
		require('./gmail-compose-view/update-insert-more-area-left')(this, oldFormattingAreaOffsetLeft);
	}

	_getFormattingAreaOffsetLeft(): number {
		return require('./gmail-compose-view/get-formatting-area-offset-left')(this);
	}

	getFormattingArea(): HTMLElement {
		return this._element.querySelector('.oc');
	}

	getFormattingToolbar(): HTMLElement {
		return this._element.querySelector('.aX');
	}

	getFormattingToolbarArrow(): HTMLElement {
		return this.getFormattingToolbar().querySelector('.aA4');
	}

	getFormattingToolbarToggleButton(): HTMLElement {
		var innerElement = this._element.querySelector('[role=button] .dv');
		return $(innerElement).closest('[role=button]')[0];
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
		return this._element.querySelector('.eq');
	}

	getInsertLinkButton(): HTMLElement {
		return this._element.querySelector('.e5.aaA.aMZ');
	}

	getSendButton(): HTMLElement {
		return this._element.querySelector('.IZ .Up > div > [role=button]');
	}

	getSendAndArchiveButton(): ?HTMLElement {
		if(!this.isReply()){
			return null;
		}

		var siblings = $(this.getSendButton()).siblings();
		if(siblings.length === 0){
			return null;
		}

		return siblings.first().find('[role=button]')[0];
	}

	getCloseButton(): HTMLElement {
		return this._element.querySelectorAll('.Hm > img')[2];
	}

	getBottomBarTable(): HTMLElement {
		return this._element.querySelector('.aoP .aDh > table');
	}

	getBottomToolbarContainer(): HTMLElement {
		return this._element.querySelector('.aoP .aDj');
	}

	getComposeID(): string {
		return this._composeID;
	}

	getInitialMessageID(): ?string {
		return this._initialMessageId;
	}

	getMessageID(): ?string {
		var input = this._messageIDElement;

		if(!input){
			return this._messageId;
		}

		return input.value && (input.value !== 'undefined' && input.value !== 'null') ? input.value : this._messageId;
	}

	getTargetMessageID(): ?string {
		return this._targetMessageID;
	}

	getThreadID(): ?string {
		return this._threadID;
	}

	getRecipientRowElements(): HTMLElement[] {
		return _.filter(this._element.querySelectorAll('.GS tr'), (tr) => !tr.classList.contains('inboxsdk__recipient_row'));
	}

	addManagedViewController(viewController: {destroy: () => void}) {
		this._managedViewControllers.push(viewController);
	}

	ensureGroupingIsOpen(type: string) {
		ensureGroupingIsOpen(this._element, type);
	}

	minimize() {
		var minimizeButton = this._element.querySelector('.Hm > img');
		if(minimizeButton){
			simulateClick(minimizeButton);
		}
	}

	restore() {
		this.minimize(); //minize and restore buttons are the same
	}

	_triggerDraftSave() {
		if(this._isTriggeringADraftSavePending){
			return;
		}
		else{
			this._isTriggeringADraftSavePending = true;
			asap(() => {
				this._isTriggeringADraftSavePending = false;

				if(this.getBodyElement()){
					var unsilence = this._driver.getPageCommunicator().silenceGmailErrorsForAMoment();
					try {
						simulateKey(this.getBodyElement(), 13, 0);
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
		var input = this._element.querySelector('input[name="rm"]');
		return input && input.value && input.value != 'undefined' ? input.value : null;
	}

	_getThreadID(): ?string {
		var targetID = this.getTargetMessageID();
		return targetID ? this._driver.getThreadIDForMessageID(targetID) : null;
	}

	getElement(): HTMLElement {
		return this._element;
	}

	setIsInlineReplyForm(inline: boolean) {
		this._isInlineReplyForm = inline;
	}

	getIsFullscreen(): boolean {
		return this._isFullscreen;
	}

	setIsStandalone(isStandalone: boolean) {
		this._isStandalone = isStandalone;
	}

	getLastSelectionRange(): ?Object {
		return this._lastSelectionRange;
	}

	setLastSelectionRange(lastSelectionRange: ?Object) {
		this._lastSelectionRange = lastSelectionRange;
	}
}

// This function does not get executed. It's only checked by Flow to make sure
// this class successfully implements the type interface.
function __interfaceCheck() {
	var test: ComposeViewDriver = new GmailComposeView(document.body, ({}:any), ({}:any));
}
