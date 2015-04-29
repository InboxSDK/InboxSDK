import _ from 'lodash';
import $ from 'jquery';
import RSVP from 'rsvp';
import Bacon from 'baconjs';

import simulateClick from '../../../lib/dom/simulate-click';

import * as GmailResponseProcessor from '../gmail-response-processor';
import GmailElementGetter from '../gmail-element-getter';

import waitFor from '../../../lib/wait-for';

import ComposeViewDriver from '../../../driver-interfaces/compose-view-driver';

import addAccessors from '../../../lib/add-accessors';
import assertInterface from '../../../lib/assert-interface';

import addStatusBar from './gmail-compose-view/add-status-bar';

export default class GmailComposeView {
	constructor(element, xhrInterceptorStream) {
		this._element = element;
		this._element.classList.add('inboxsdk__compose');

		this._isInlineReplyForm = false;
		this._isFullscreen = false;
		this._isStandalone = false;
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
			waitFor(() => {
				return !!this.getBodyElement();
			}).then(() => {
				this._composeID = this._element.querySelector('input[name="composeid"]').value;

				this._setupStreams();
				this._setupConsistencyCheckers();
				this._updateComposeFullscreenState();

				return this;
			})
		);
	}

	_setupStreams() {
		this._eventStream.plug(require('./gmail-compose-view/get-body-changes-stream')(this));
		this._eventStream.plug(require('./gmail-compose-view/get-address-changes-stream')(this));
		this._eventStream.plug(require('./gmail-compose-view/get-presending-stream')(this));
		this._eventStream.plug(require('./gmail-compose-view/get-minimize-restore-stream')(this));
	}

	_setupConsistencyCheckers() {
		require('./gmail-compose-view/ensure-link-chips-work')(this);
		require('./gmail-compose-view/monitor-selection-range')(this);
		require('./gmail-compose-view/manage-button-grouping')(this);
	}

	_updateComposeFullscreenState() {
		this._isFullscreen = this._isStandalone || GmailElementGetter.getFullscreenComposeWindowContainer().contains(this._element);
	}

	focus() {
		require('./gmail-compose-view/focus')(this);
	}

	insertBodyTextAtCursor(text) {
		return require('../../../lib/dom/insert-text-at-cursor')(this.getBodyElement(), text);
	}

	insertBodyHTMLAtCursor(html) {
		return require('../../../lib/dom/insert-html-at-cursor')(this.getBodyElement(), html);
	}

	insertLinkIntoBody(text, href) {
		return require('./gmail-compose-view/insert-link-into-body')(this, text, href);
	}

	insertLinkChipIntoBody(options) {
		return require('./gmail-compose-view/insert-link-chip-into-body')(this, options);
	}

	setSubject(text) {
		$(this._element).find('input[name=subjectbox]').val(text);
		$(this._element).find('input[type=hidden][name=subjectbox]').val(text);
	}

	setToRecipients(emails) {
		require('./gmail-compose-view/set-recipients')(this, 0, emails);
	}

	setCcRecipients(emails) {
		require('./gmail-compose-view/set-recipients')(this, 1, emails);
	}

	setBccRecipients(emails) {
		require('./gmail-compose-view/set-recipients')(this, 2, emails);
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

	addStatusBar() {
		return addStatusBar(this);
	}

	close() {
		if(this.isInlineReplyForm()){
			console.warn("Trying to close an inline reply which doesn't work.");
			return;
		}

		simulateClick(this.getCloseButton());
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
		return require('../../../lib/dom/get-selected-html')(this.getBodyElement(), this._selectionRange);
	}

	getSelectedBodyText() {
		this.focus();
		return require('../../../lib/dom/get-selected-text')(this.getBodyElement(), this._selectionRange);
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

	getMessageID()  {
		const input = this._element.querySelector('input[name="draft"]');
		return input && input.value && input.value != 'undefined' ? input.value : null;
	}

	getThreadID() {
		const input = this._element.querySelector('input[name="rm"]');
		return input && input.value && input.value != 'undefined' ? input.value : null;
	}

	getRecipientRowElements() {
		return this._element.querySelectorAll('.GS tr');
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
}

addAccessors(GmailComposeView.prototype, [
	{name: '_element', destroy: false, get: true},
	{name: '_eventStream', destroy: true, get: true, destroyMethod: 'end'},
	{name: '_managedViewControllers', destroy: true},
	{name: '_isInlineReplyForm', destroy: false, set: true},
	{name: '_isFullscreen', destroy: false, get: true},
	{name: '_isStandalone', destroy: false, set: true},
	{name: '_selectionRange', destroy: false, set: true, get: true},
	{name: '_buttonViewControllerTooltipMap', destroy: false}
]);

assertInterface(GmailComposeView.prototype, ComposeViewDriver);
