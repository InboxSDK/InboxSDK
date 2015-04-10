const _ = require('lodash');
const $ = require('jquery');
const RSVP = require('rsvp');
const Bacon = require('baconjs');

const simulateClick = require('../../../lib/dom/simulate-click');
const setValueAndDispatchEvent = require('../../../lib/dom/set-value-and-dispatch-event');

const GmailResponseProcessor = require('../gmail-response-processor');
const GmailElementGetter = require('../gmail-element-getter');

const waitFor = require('../../../lib/wait-for');

const ComposeWindowDriver = require('../../../driver-interfaces/compose-view-driver');


const GmailComposeView = function(element, xhrInterceptorStream){
	ComposeWindowDriver.call(this);

	this._element = element;
	this._element.classList.add('inboxsdk__compose');

	this._eventStream = new Bacon.Bus();

	var self = this;
	this._eventStream.plug(
		Bacon.mergeAll(
			xhrInterceptorStream.filter(function(event) {
				return event.type === 'emailSending' && event.composeId === self.getComposeID();
			}).map(function(event) {
				return {eventName: 'sending'};
			}),
			xhrInterceptorStream.filter(function(event) {
				return event.type === 'emailSent' && event.composeId === self.getComposeID();
			}).map(function(event) {
				var response = GmailResponseProcessor.interpretSentEmailResponse(event.response);
				return {eventName: 'sent', data: response};
			}),
			Bacon.fromEventTarget(this._element, 'buttonAdded').map(function(){
				return {
					eventName: 'buttonAdded'
				};
			}),
			Bacon
				.fromEventTarget(this._element, 'composeFullscreenStateChanged')
				.doAction(() => this._updateComposeFullscreenState())
				.map(function(){
					return {
						eventName: 'composeFullscreenStateChanged'
					};
				})
		)
	);

	this._buttonViewControllerTooltipMap = new WeakMap();

	this.ready = _.constant(
		waitFor(function(){
			return !!self.getBodyElement();
		}).then(function(){
			self._composeID = self._element.querySelector('input[name="composeid"]').value;

			self._setupStreams();
			self._setupConsistencyCheckers();

			return self;
		})
	);
};

GmailComposeView.prototype = Object.create(ComposeWindowDriver.prototype);

_.extend(GmailComposeView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_additionalAreas', destroy: true, get: true, defaultValue: {}},
		{name: '_managedViewControllers', destroy: true, defaultValue: []},
		{name: '_isInlineReplyForm', destroy: true, set: true, defaultValue: false},
		{name: '_isFullscreen', destroy: false, get: true, defaultValue: false},
		{name: '_isStandalone', destroy: false, set: true, defaultValue: false},
		{name: '_selectionRange', destroy: false, set: true, get: true},
		{name: '_buttonViewControllerTooltipMap', destroy: false}
	],

	_setupStreams: function(){
		this._eventStream.plug(require('./gmail-compose-view/get-body-changes-stream')(this));
		this._eventStream.plug(require('./gmail-compose-view/get-address-changes-stream')(this));
		this._eventStream.plug(require('./gmail-compose-view/get-presending-stream')(this));
		this._eventStream.plug(require('./gmail-compose-view/get-minimize-restore-stream')(this));
	},

	_setupConsistencyCheckers: function(){
		require('./gmail-compose-view/ensure-link-chips-work')(this);
		require('./gmail-compose-view/monitor-selection-range')(this);
		require('./gmail-compose-view/manage-button-grouping')(this);
	},

	_updateComposeFullscreenState: function(){
		this._isFullscreen = this._isStandalone || GmailElementGetter.getFullscreenComposeWindowContainer().contains(this._element);
	},

	focus: function(){
		require('./gmail-compose-view/focus')(this);
	},

	insertBodyTextAtCursor: function(text){
		return require('../../../lib/dom/insert-text-at-cursor')(this.getBodyElement(), text);
	},

	insertBodyHTMLAtCursor: function(html){
		return require('../../../lib/dom/insert-html-at-cursor')(this.getBodyElement(), html);
	},

	insertLinkIntoBody: function(text, href){
		return require('./gmail-compose-view/insert-link-into-body')(this, text, href);
	},

	insertLinkChipIntoBody: function(options){
		return require('./gmail-compose-view/insert-link-chip-into-body')(this, options);
	},

	setSubject: function(text){
		$(this._element).find('input[name=subjectbox]').val(text);
		$(this._element).find('input[type=hidden][name=subjectbox]').val(text);
	},

	setToRecipients: function(emails){
		require('./gmail-compose-view/set-recipients')(this, 0, emails);
	},

	setCcRecipients: function(emails){
		require('./gmail-compose-view/set-recipients')(this, 1, emails);
	},

	setBccRecipients: function(emails){
		require('./gmail-compose-view/set-recipients')(this, 2, emails);
	},

	addButton: function(buttonDescriptor, groupOrderHint, extraOnClickOptions){
		return require('./gmail-compose-view/add-button')(this, buttonDescriptor, groupOrderHint, extraOnClickOptions);
	},

	addTooltipToButton: function(buttonViewController,buttonDescriptor,  tooltipDescriptor){
		let tooltip = require('./gmail-compose-view/add-tooltip-to-button')(this, buttonViewController, buttonDescriptor, tooltipDescriptor);
		this._buttonViewControllerTooltipMap.set(buttonViewController, tooltip);
	},

	closeButtonTooltip: function(buttonViewController){
		if(!this._buttonViewControllerTooltipMap){
			return;
		}

		let tooltip = this._buttonViewControllerTooltipMap.get(buttonViewController);
		if(tooltip){
			tooltip.destroy();
			this._buttonViewControllerTooltipMap.delete(buttonViewController);
		}
	},

	addOuterSidebar: function(options){
		if(this.isInlineReplyForm()){
			console.warn("Trying to add an outer sidebar to an inline reply which doesn't work.");
			return;
		}

		require('./gmail-compose-view/add-outer-sidebar')(this, options);
	},

	addInnerSidebar: function(options){
		if(this.isInlineReplyForm()){
			console.warn("Trying to add an inner sidebar to an inline reply which doesn't work.");
			return;
		}

		require('./gmail-compose-view/add-inner-sidebar')(this, options);
	},

	close: function(){
		if(this.isInlineReplyForm()){
			console.warn("Trying to close an inline reply which doesn't work.");
			return;
		}

		simulateClick(this.getCloseButton());
	},

	isReply: function(){
		return this._isInlineReplyForm || !!this._element.querySelector('.HQ');
	},

	isInlineReplyForm: function(){
		return this._isInlineReplyForm;
	},

	getBodyElement: function(){
		return this._element.querySelector('.Ap [g_editable=true]');
	},

	getHTMLContent: function(){
		return this.getBodyElement().innerHTML;
	},

	getTextContent: function(){
		return this.getBodyElement().textContent;
	},

	getSelectedBodyHTML: function(){
		this.focus();
		return require('../../../lib/dom/get-selected-html')(this.getBodyElement(), this._selectionRange);
	},

	getSelectedBodyText: function(){
		this.focus();
		return require('../../../lib/dom/get-selected-text')(this.getBodyElement(), this._selectionRange);
	},

	getSubject: function(){
		return $(this._element).find('input[name=subjectbox]').val();
	},

	getToRecipients: function(){
		return require('./gmail-compose-view/get-recipients')(this, 0, "to");
	},

	getCcRecipients: function(){
		return require('./gmail-compose-view/get-recipients')(this, 1, "cc");
	},

	getBccRecipients: function(){
		return require('./gmail-compose-view/get-recipients')(this, 2, "bcc");
	},

	getAdditionalActionToolbar: function(){
		return require('./gmail-compose-view/get-additional-action-toolbar')(this);
	},

	updateInsertMoreAreaLeft: function(oldFormattingAreaOffsetLeft) {
		require('./gmail-compose-view/update-insert-more-area-left')(this, oldFormattingAreaOffsetLeft);
	},

	_getFormattingAreaOffsetLeft: function() {
		return require('./gmail-compose-view/get-formatting-area-offset-left')(this);
	},

	getFormattingArea: function() {
		return this._element.querySelector('.oc');
	},

	getFormattingToolbar: function(){
		return this._element.querySelector('.aX');
	},

	getFormattingToolbarArrow: function(){
		return this.getFormattingToolbar().querySelector('.aA4');
	},

	getFormattingToolbarToggleButton: function(){
		var innerElement = this._element.querySelector('[role=button] .dv');
		return $(innerElement).closest('[role=button]')[0];
	},

	getInsertMoreArea: function() {
		return this._element.querySelector('.eq');
	},

	getInsertLinkButton: function() {
		return this._element.querySelector('.e5.aaA.aMZ');
	},

	getSendButton: function(){
		return this._element.querySelector('.IZ .Up > div > [role=button]');
	},

	getSendAndArchiveButton: function(){
		if(!this.isReply()){
			return null;
		}

		var siblings = $(this.getSendButton()).siblings();
		if(siblings.length === 0){
			return null;
		}

		return siblings.first().find('[role=button]')[0];
	},

	getCloseButton: function(){
		return this._element.querySelectorAll('.Hm > img')[2];
	},

	getBottomBarTable: function(){
		return this._element.querySelector('.aoP .aDh > table');
	},

	getBottomToolbarContainer: function(){
		return this._element.querySelector('.aoP .aDj');
	},

	getComposeID: function(){
		return this._composeID;
	},

	getDraftID: function() {
		var input = this._element.querySelector('input[name="draft"]');
		return input && input.value;
	},

	getRecipientRowElements: function(){
		return this._element.querySelectorAll('.GS tr');
	},

	addManagedViewController: function(viewController){
		this._managedViewControllers.push(viewController);
	},

	ensureGroupingIsOpen: function(type){
		require('./gmail-compose-view/ensure-grouping-is-open')(this._element, type);
	},

	minimize: function(){
		let minimizeButton = this._element.querySelector('.Hm > img');
		if(minimizeButton){
			simulateClick(minimizeButton);
		}
	},

	restore: function(){
		this.minimize(); //minize and restore buttons are the same
	},

	destroy: function(){
		this._eventStream.end();
		this._eventStream = null;

		ComposeWindowDriver.prototype.destroy.call(this);
	}

});


module.exports = GmailComposeView;
