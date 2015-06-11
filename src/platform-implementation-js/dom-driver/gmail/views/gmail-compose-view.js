import _ from 'lodash';
import $ from 'jquery';
import RSVP from 'rsvp';
import Bacon from 'baconjs';

import delayAsap from '../../../lib/delay-asap';
import simulateClick from '../../../lib/dom/simulate-click';
import simulateKey from '../../../lib/dom/simulate-key';
import * as GmailResponseProcessor from '../gmail-response-processor';
import GmailElementGetter from '../gmail-element-getter';

import streamWaitFor from '../../../lib/stream-wait-for';
import dispatchCustomEvent from '../../../lib/dom/dispatch-custom-event';

import ComposeViewDriver from '../../../driver-interfaces/compose-view-driver';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import addAccessors from 'add-accessors';
import assertInterface from '../../../lib/assert-interface';

import addStatusBar from './gmail-compose-view/add-status-bar';

import * as fromManager from './gmail-compose-view/from-manager';

export default class GmailComposeView {
	constructor(element, xhrInterceptorStream, driver) {
		this._element = element;
		this._element.classList.add('inboxsdk__compose');

		this._isInlineReplyForm = false;
		this._isFullscreen = false;
		this._isStandalone = false;
		this._driver = driver;
		this._managedViewControllers = [];
		this._eventStream = new Bacon.Bus();

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
			streamWaitFor(
				() => !this._element || !!this.getBodyElement(),
				3*60 * 1000, //timeout
				250 //steptime
			).filter(() => !!this._element)
			.map(() => {
				this._composeID = this._element.querySelector('input[name="composeid"]').value;
				this._messageIDElement = this._element.querySelector('input[name="draft"]');
				if (!this._messageIDElement) {
					driver.getLogger().error(new Error("Could not find compose message id field"));
					// stub so other things don't fail
					this._messageIDElement = document.createElement('div');
				}

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

	_setupStreams() {
		this._eventStream.plug(require('./gmail-compose-view/get-body-changes-stream')(this));
		this._eventStream.plug(require('./gmail-compose-view/get-address-changes-stream')(this));
		this._eventStream.plug(require('./gmail-compose-view/get-presending-stream')(this));
		this._eventStream.plug(Bacon.later(10).flatMap(()=>require('./gmail-compose-view/get-minimize-restore-stream')(this)));
		this._eventStream.plug(
			makeMutationObserverChunkedStream(this._messageIDElement, {attributes:true, attributeFilter:['value']})
				.map(() => ({
					eventName: 'messageIDChange',
					data: this.getMessageID()
				}))
		);
	}

	_setupConsistencyCheckers() {
		require('./gmail-compose-view/ensure-link-chips-work')(this);
		require('./gmail-compose-view/monitor-selection-range')(this);
		require('./gmail-compose-view/manage-button-grouping')(this);
	}

	_updateComposeFullscreenState() {
		this._isFullscreen = !this._isInlineReplyForm &&
			(this._isStandalone ||
				GmailElementGetter.getFullscreenComposeWindowContainer().contains(this._element));
	}

	focus() {
		require('./gmail-compose-view/focus')(this);
	}

	insertBodyTextAtCursor(text) {
		let retVal = this.insertBodyHTMLAtCursor(_.escape(text).replace(/\n/g, '<br>'));

		this._triggerDraftSave();
		return retVal;
	}

	insertBodyHTMLAtCursor(html) {
		let retVal = require('../../../lib/dom/insert-html-at-cursor')(this.getBodyElement(), html, this._lastSelectionRange);

		this._triggerDraftSave();
		return retVal;
	}

	insertLinkIntoBody(text, href) {
		let retVal = require('./gmail-compose-view/insert-link-into-body')(this, text, href);

		this._triggerDraftSave();
		return retVal;
	}

	insertLinkChipIntoBody(options) {
		let retVal = require('./gmail-compose-view/insert-link-chip-into-body')(this, options);

		this._triggerDraftSave();
		return retVal;
	}

	setSubject(text) {
		$(this._element).find('input[name=subjectbox]').val(text);
		$(this._element).find('input[type=hidden][name=subjectbox]').val(text);

		this._triggerDraftSave();
	}

	setBodyHTML(html){
		this.getBodyElement().innerHTML = html;
		$(this._element).find('input[type=hidden][name=body]').val(html);

		this._triggerDraftSave();
	}

	setBodyText(text){
		this.getBodyElement().textContent = text;
		$(this._element).find('input[type=hidden][name=body]').val(text);

		this._triggerDraftSave();
	}

	setToRecipients(emails) {
		require('./gmail-compose-view/set-recipients')(this, 0, emails);

		this._triggerDraftSave();
	}

	setCcRecipients(emails) {
		require('./gmail-compose-view/set-recipients')(this, 1, emails);

		this._triggerDraftSave();
	}

	setBccRecipients(emails) {
		require('./gmail-compose-view/set-recipients')(this, 2, emails);

		this._triggerDraftSave();
	}

	addRecipientRow(options){
		return require('./gmail-compose-view/add-recipient-row')(this, options);
	}

	getFromContact() {
		return fromManager.getFromContact(this._driver, this);
	}

	getFromContactChoices() {
		return fromManager.getFromContactChoices(this._driver, this);
	}

	setFromEmail(email) {
		fromManager.setFromEmail(this._driver, this, email);
	}

	addButton(buttonDescriptor, groupOrderHint, extraOnClickOptions) {
		return require('./gmail-compose-view/add-button')(this, buttonDescriptor, groupOrderHint, extraOnClickOptions);
	}

	addTooltipToButton(buttonViewController,buttonDescriptor,  tooltipDescriptor) {
		const tooltip = require('./gmail-compose-view/add-tooltip-to-button')(this, buttonViewController, buttonDescriptor, tooltipDescriptor);
		this._buttonViewControllerTooltipMap.set(buttonViewController, tooltip);
	}

	closeButtonTooltip(buttonViewController) {
		if(!this._buttonViewControllerTooltipMap){
			return;
		}

		const tooltip = this._buttonViewControllerTooltipMap.get(buttonViewController);
		if(tooltip){
			tooltip.destroy();
			this._buttonViewControllerTooltipMap.delete(buttonViewController);
		}
	}

	addOuterSidebar(options) {
		if(this.isInlineReplyForm()){
			console.warn("Trying to add an outer sidebar to an inline reply which doesn't work.");
			return;
		}

		require('./gmail-compose-view/add-outer-sidebar')(this, options);
	}

	addInnerSidebar(options) {
		if(this.isInlineReplyForm()){
			console.warn("Trying to add an inner sidebar to an inline reply which doesn't work.");
			return;
		}

		require('./gmail-compose-view/add-inner-sidebar')(this, options);
	}

	addStatusBar(options={}) {
		const statusBar = addStatusBar(this, options);
		dispatchCustomEvent(this._element, 'resize');
		Bacon.fromEvent(statusBar, 'destroy')
			.map(() => ({eventName:'statusBarRemoved'}))
			.flatMap(delayAsap)
			.takeUntil(this._eventStream.filter(false).mapEnd())
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

	isReply() {
		return this._isInlineReplyForm || !!this._element.querySelector('.HQ');
	}

	isInlineReplyForm() {
		return this._isInlineReplyForm;
	}

	getBodyElement() {
		return this._element.querySelector('.Ap [g_editable=true]');
	}

	getHTMLContent() {
		return this.getBodyElement().innerHTML;
	}

	getTextContent() {
		return this.getBodyElement().textContent;
	}

	getSelectedBodyHTML() {
		this.focus();
		return require('../../../lib/dom/get-selected-html')(this.getBodyElement(), this._lastSelectionRange);
	}

	getSelectedBodyText() {
		this.focus();
		return require('../../../lib/dom/get-selected-text')(this.getBodyElement(), this._lastSelectionRange);
	}

	getSubject() {
		return $(this._element).find('input[name=subjectbox]').val();
	}

	getToRecipients() {
		return require('./gmail-compose-view/get-recipients')(this, 0, "to");
	}

	getCcRecipients() {
		return require('./gmail-compose-view/get-recipients')(this, 1, "cc");
	}

	getBccRecipients() {
		return require('./gmail-compose-view/get-recipients')(this, 2, "bcc");
	}

	getAdditionalActionToolbar() {
		return require('./gmail-compose-view/get-additional-action-toolbar')(this);
	}

	updateInsertMoreAreaLeft(oldFormattingAreaOffsetLeft)  {
		require('./gmail-compose-view/update-insert-more-area-left')(this, oldFormattingAreaOffsetLeft);
	}

	_getFormattingAreaOffsetLeft()  {
		return require('./gmail-compose-view/get-formatting-area-offset-left')(this);
	}

	getFormattingArea()  {
		return this._element.querySelector('.oc');
	}

	getFormattingToolbar() {
		return this._element.querySelector('.aX');
	}

	getFormattingToolbarArrow() {
		return this.getFormattingToolbar().querySelector('.aA4');
	}

	getFormattingToolbarToggleButton() {
		const innerElement = this._element.querySelector('[role=button] .dv');
		return $(innerElement).closest('[role=button]')[0];
	}

	getInsertMoreArea()  {
		return this._element.querySelector('.eq');
	}

	getInsertLinkButton()  {
		return this._element.querySelector('.e5.aaA.aMZ');
	}

	getSendButton() {
		return this._element.querySelector('.IZ .Up > div > [role=button]');
	}

	getSendAndArchiveButton() {
		if(!this.isReply()){
			return null;
		}

		const siblings = $(this.getSendButton()).siblings();
		if(siblings.length === 0){
			return null;
		}

		return siblings.first().find('[role=button]')[0];
	}

	getCloseButton() {
		return this._element.querySelectorAll('.Hm > img')[2];
	}

	getBottomBarTable() {
		return this._element.querySelector('.aoP .aDh > table');
	}

	getBottomToolbarContainer() {
		return this._element.querySelector('.aoP .aDj');
	}

	getComposeID() {
		return this._composeID;
	}

	getMessageID() {
		const input = this._messageIDElement;
		return input.value && input.value != 'undefined' ? input.value : null;
	}

	// If this compose is a reply, then this gets the message ID of the message
	// we're replying to.
	getTargetMessageID() {
		const input = this._element.querySelector('input[name="rm"]');
		return input && input.value && input.value != 'undefined' ? input.value : null;
	}

	getThreadID() {
		const targetID = this.getTargetMessageID();
		return targetID ? this._driver.getThreadIDForMessageID(targetID) : null;
	}

	getRecipientRowElements() {
		return _.filter(this._element.querySelectorAll('.GS tr'), (tr) => !tr.classList.contains('inboxsdk__recipient_row'));
	}

	addManagedViewController(viewController) {
		this._managedViewControllers.push(viewController);
	}

	ensureGroupingIsOpen(type) {
		require('./gmail-compose-view/ensure-grouping-is-open')(this._element, type);
	}

	minimize() {
		const minimizeButton = this._element.querySelector('.Hm > img');
		if(minimizeButton){
			simulateClick(minimizeButton);
		}
	}

	restore() {
		this.minimize(); //minize and restore buttons are the same
	}

	_triggerDraftSave() {
		simulateKey(this.getBodyElement(), 13, 0);
	}
}

addAccessors(GmailComposeView.prototype, [
	{name: '_element', destroy: false, get: true},
	{name: '_driver', destroy: false},
	{name: '_eventStream', destroy: true, get: true, destroyMethod: 'end'},
	{name: '_managedViewControllers', destroy: true},
	{name: '_isInlineReplyForm', destroy: false, set: true},
	{name: '_isFullscreen', destroy: false, get: true},
	{name: '_isStandalone', destroy: false, set: true},
	{name: '_lastSelectionRange', destroy: false, set: true, get: true},
	{name: '_buttonViewControllerTooltipMap', destroy: false}
]);

assertInterface(GmailComposeView.prototype, ComposeViewDriver);
