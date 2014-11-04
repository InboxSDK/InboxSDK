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
		{name: '_addedViewControllers', destroy: true, defaultValue: []},
		{name: '_isReply', destroy: true, set: true, defaultValue: false}
	],

	insertLinkIntoBody: function(text, href){
		var self = this;

		return new RSVP.Promise(function(resolve, reject){
			if(document.hasFocus()){
				self._insertLinkIntoBody(text, href);
				resolve();
			}
			else{
				Bacon.fromEventTarget(window, 'focus').take(1).onValue(function(){
					self._insertLinkIntoBody(text, href);
					resolve();
				});
			}
		});
	},

	_insertLinkIntoBody: function(text, href){
		this._getEditor().focus();

		simulateClick(this._getInsertLinkButton()[0]);

		if($('#linkdialog-text').length === 0){
			return;
		}

		var originalText = $('#linkdialog-text').val();
		setValueAndDispatchEvent($('#linkdialog-onweb-tab-input')[0], href, 'input');

		simulateClick($('button[name=ok]')[0]);

		var $link = this._getEditor().find('a[href="'+href+'"]');

		if(originalText.length === 0){
			$link.text(text);
		}
	},

	addButton: function(buttonDescriptor){
		if(!buttonDescriptor.section || buttonDescriptor.section === 'TRAY_LEFT'){
			this._addButtonToTrayLeft(buttonDescriptor);
		}
		else if(buttonDescriptor.section === 'SEND_RIGHT'){
			this._addButtonToSendRight(buttonDescriptor);
		}
	},

	isReply: function(){
		return this._isReply;
	},

	_addButtonToTrayLeft: function(buttonDescriptor){
		buttonDescriptor.buttonColor = 'flatIcon';

		var buttonViewController = this._getButtonViewController(buttonDescriptor);

		var formattingAreaOffsetLeft = this._getFormattingAreaOffsetLeft();
		var element = buttonViewController.getView().getElement();

		if (!this._additionalAreas.actionToolbar) {
			this._additionalAreas.actionToolbar = this._addActionToolbar();
		}

		this._additionalAreas.actionToolbar.prepend(element);
		this._updateInsertMoreAreaLeft(formattingAreaOffsetLeft);

		this._addedViewControllers.push(buttonViewController);
	},

	_addActionToolbar: function() {
		var td = $(document.createElement('td'));
		td[0].setAttribute('class', 'inboxsdk__compose_actionToolbar gU');
		this._getFormattingArea().before(td);

		var separator = document.createElement('td');
		separator.setAttribute('class', 'inboxsdk__compose_separator gU');
		separator.innerHTML = '<div class="Uz"></div>';

		td.after(separator);

		td.closest('table').find('colgroup col').first()
			.after('<col class="inboxsdk__compose_actionToolbarColumn"></col><col class="inboxsdk__compose_separatorColumn"></col>');

		return $("<div/>").appendTo(td);
	},

	_addButtonToSendRight: function(buttonDescriptor){
		//do nothing for now
	},

	_getButtonViewController: function(buttonDescriptor){
		var buttonViewController = null;

		var buttonView = new IconButtonView(buttonDescriptor);
		buttonDescriptor.buttonView = buttonView;

		if(buttonDescriptor.hasDropdown){
			var menuView = new MenuView();
			buttonDescriptor.menuView = menuView;
			buttonDescriptor.menuPositionOptions = {isBottomAligned: true};
			buttonViewController = new MenuButtonViewController(buttonDescriptor);
		}
		else{
			buttonViewController = new BasicButtonViewController(buttonDescriptor);
		}

		return buttonViewController;
	},

	_updateInsertMoreAreaLeft: function(oldFormattingAreaOffsetLeft) {
		var newFormattingAreaOffsetLeft = this._getFormattingAreaOffsetLeft();
		var insertMoreAreaLeft = parseInt(this._getInsertMoreArea().css('left'), 10);

		var diff = newFormattingAreaOffsetLeft - oldFormattingAreaOffsetLeft;

		this._getInsertMoreArea().css('left', (insertMoreAreaLeft + diff) + 'px');
	},

	_getFormattingAreaOffsetLeft: function() {
		var formattingArea = this._getFormattingArea();
		if (!formattingArea) {
			return 0;
		}

		var offset = formattingArea.offset();
		if (!offset) {
			return 0;
		}

		return offset.left;
	},

	_getFormattingArea: function() {
		return $(this._element).find('.oc');
	},

	_getInsertMoreArea: function() {
		return $(this._element).find('.eq');
	},

	_getEditor: function(){
		return $(this._element).find('.Ap [g_editable=true]');
	},

	_getInsertLinkButton: function() {
		return $(this._element).find('.e5.aaA.aMZ');
	}

});


module.exports = GmailComposeView;
