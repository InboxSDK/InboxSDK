var _ = require('lodash');
var $ = require('jquery');
var RSVP = require('rsvp');
var Bacon = require('baconjs');

var simulateClick = require('../../../lib/dom/simulate-click');
var setValueAndDispatchEvent = require('../../../lib/dom/set-value-and-dispatch-event');

var ComposeWindowDriver = require('../../../driver-interfaces/compose-view-driver');
var IconButtonView = require('../widgets/buttons/icon-button-view');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');
var MenuButtonViewController = require('../../../widgets/buttons/menu-button-view-controller');

var MenuView = require('../widgets/menu-view');

var GmailComposeView = function(element){
	ComposeWindowDriver.call(this);

	this._element = element;
};

GmailComposeView.prototype = Object.create(ComposeWindowDriver.prototype);

_.extend(GmailComposeView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_additionalAreas', destroy: true, defaultValue: {}},
		{name: '_managedViewControllers', destroy: true, defaultValue: []},
		{name: '_isInlineReplyForm', destroy: true, set: true, defaultValue: false}
	],

	insertBodyTextAtCursor: function(text){
		require('../../../lib/dom/insert-text-at-cursor')(this.getBodyElement(), text);
	},

	insertBodyHTMLAtCursor: function(html){
		require('../../../lib/dom/insert-html-at-cursor')(this.getBodyElement(), html);
	},

	insertLinkIntoBody: function(text, href){
		require('./compose-view/insert-link-into-body')(this, text, href);
	},

	setSubject: function(text){
		$(this._element).find('input[name=subjectbox]').val(text);
		$(this._element).find('input[type=hidden][name=subjectbox]').val(text);
	},

	setToRecipients: function(emails){
		require('./compose-view/set-recipients')(this, 0, emails);
	},

	setCcRecipients: function(emails){
		require('./compose-view/set-recipients')(this, 1, emails);
	},

	setBccRecipients: function(emails){
		require('./compose-view/set-recipients')(this, 2, emails);
	},

	addButton: function(buttonDescriptor){
		require('./compose-view/add-button')(this, buttonDescriptor);
	},

	close: function(){
		if(this.isInlineReplyForm()){
			console.warn("Trying to close an inline reply which doesn't work.");
			return;
		}

		simulateClick(this.getCloseButton()[0]);
	},

	isReply: function(){
		return this._isInlineReplyForm || !!this._element.querySelector('.HQ');
	},

	isInlineReplyForm: function(){
		return this._isInlineReplyForm;
	},

	getBodyElement: function(){
		return $(this._element).find('.Ap [g_editable=true]')[0];
	},

	getHTMLContent: function(){
		return $(this.getBodyElement()).innerHTML;
	},

	getTextContent: function(){
		return $(this.getBodyElement()).textContent;
	},

	getSelectedBodyHTML: function(){
		return require('../../../lib/dom/get-selected-html')(this.getBodyElement());
	},

	getSubject: function(){
		return $(this._element).find('input[name=subjectbox]').val();
	},

	getToRecipients: function(){
		return require('./compose-view/get-recipients')(this, 0);
	},

	getCcRecipients: function(){
		return require('./compose-view/get-recipients')(this, 1);
	},

	getBccRecipients: function(){
		return require('./compose-view/get-recipients')(this, 2);
	},

	getAdditionalActionToolbar: function(){
		return require('./compose-view/get-additional-action-toolbar')(this);
	},

	updateInsertMoreAreaLeft: function(oldFormattingAreaOffsetLeft) {
		require('./compose-view/update-insert-more-area-left')(this, oldFormattingAreaOffsetLeft);
	},

	_getFormattingAreaOffsetLeft: function() {
		return require('./compose-view/get-formatting-area-offset-left')(this);
	},

	getFormattingArea: function() {
		return $(this._element).find('.oc');
	},

	getInsertMoreArea: function() {
		return $(this._element).find('.eq');
	},

	getInsertLinkButton: function() {
		return $(this._element).find('.e5.aaA.aMZ');
	},

	getCloseButton: function(){
		return $($(this._element).find('.Hm > img')[2]);
	},

	addManagedViewController: function(viewController){
		this._managedViewControllers.push(viewController);
	}

});


module.exports = GmailComposeView;
