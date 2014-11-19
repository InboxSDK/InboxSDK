var _ = require('lodash');
var $ = require('jquery');
var RSVP = require('rsvp');
var Bacon = require('baconjs');

var simulateClick = require('../../../lib/dom/simulate-click');
var setValueAndDispatchEvent = require('../../../lib/dom/set-value-and-dispatch-event');

var ComposeWindowDriver = require('../../../driver-interfaces/compose-view-driver');

var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');
var MenuButtonViewController = require('../../../widgets/buttons/menu-button-view-controller');

var MenuView = require('../widgets/menu-view');

var GmailComposeView = function(element){
	ComposeWindowDriver.call(this);

	this._element = element;
	this._element.classList.add('inboxsdk__compose');
	this._eventStream = new Bacon.Bus();
};

GmailComposeView.prototype = Object.create(ComposeWindowDriver.prototype);

_.extend(GmailComposeView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_additionalAreas', destroy: true, get: true, defaultValue: {}},
		{name: '_managedViewControllers', destroy: true, defaultValue: []},
		{name: '_unsubscribeFunctions', destroy: true, defaultValue: []},
		{name: '_isInlineReplyForm', destroy: true, set: true, defaultValue: false}
	],

	insertBodyTextAtCursor: function(text){
		require('../../../lib/dom/insert-text-at-cursor')(this.getBodyElement(), text);
	},

	insertBodyHTMLAtCursor: function(html){
		require('../../../lib/dom/insert-html-at-cursor')(this.getBodyElement(), html);
	},

	insertLinkIntoBody: function(text, href){
		require('./gmail-compose-view/insert-link-into-body')(this, text, href);
	},

	insertLinkChipIntoBody: function(options){
		require('./gmail-compose-view/insert-link-chip-into-body')(this, options);
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

	addButton: function(buttonDescriptor){
		require('./gmail-compose-view/add-button')(this, buttonDescriptor);
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
		return require('../../../lib/dom/get-selected-html')(this.getBodyElement());
	},

	getSubject: function(){
		return $(this._element).find('input[name=subjectbox]').val();
	},

	getToRecipients: function(){
		return require('./gmail-compose-view/get-recipients')(this, 0);
	},

	getCcRecipients: function(){
		return require('./gmail-compose-view/get-recipients')(this, 1);
	},

	getBccRecipients: function(){
		return require('./gmail-compose-view/get-recipients')(this, 2);
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

	getCloseButton: function(){
		return this._element.querySelectorAll('.Hm > img')[2];
	},

	getBottomBarTable: function(){
		return this._element.querySelector('.aoP .aDh > table');
	},

	getComposeID: function(){

	},

	addManagedViewController: function(viewController){
		this._managedViewControllers.push(viewController);
	},

	addUnsubscribeFunction: function(unsubscribeFunction){
		this._unsubscribeFunctions.push(unsubscribeFunction);
	}

});


module.exports = GmailComposeView;
