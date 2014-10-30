var _ = require('lodash');
var $ = require('jquery');

var simulateClick = require('../../lib/dom/simulate-click');
var setValueAndDispatchEvent = require('../../dom/set-value-and-dispatch-event');

var ComposeWindowDriver = require('../../driver-interfaces/compose-view-driver');
var IconButtonView = require('../widgets/buttons/icon-button-view');
var BasicButtonViewController = require('../../widgets/buttons/basic-button-view-controller');

var GmailComposeWindow = function(element){
	ComposeWindowDriver.call(this);

	this._element = element;
};

GmailComposeWindow.prototype = Object.create(ComposeWindowDriver.prototype);

_.extend(GmailComposeWindow.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_additionalAreas', destroy: true, defaultValue: {}},
		{name: '_addedViewControllers', destroy: true, defaultValue: []}
	],

	insertLinkIntoBody: function(text, href){
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

	addActionButton: function(buttonOptions){
		var iconButtonView = new IconButtonView(buttonOptions);

		buttonOptions.buttonView = iconButtonView;
		var basicButtonViewController = new BasicButtonViewController(buttonOptions);

		var formattingAreaOffsetLeft = this._getFormattingAreaOffsetLeft();
		var element = basicButtonViewController.getView().getElement();

		if (!this._additionalAreas.actionToolbar) {
			this._additionalAreas.actionToolbar = this._addActionToolbar();
		}

		this._additionalAreas.actionToolbar.prepend(element);
		this._updateInsertMoreAreaLeft(formattingAreaOffsetLeft);

		this._addedViewControllers.push(basicButtonViewController);

		// this._additionalToolbarAreaSizeCheck();
	},

	_addActionToolbar: function() {
		var td = $(document.createElement('td'));
		td[0].setAttribute('class', 'gmailsdk__compose_actionToolbar gU');
		this._getFormattingArea().before(td);

		var separator = document.createElement('td');
		separator.setAttribute('class', 'gmailsdk__compose_separator gU');
		separator.innerHTML = '<div class="Uz"></div>';

		td.after(separator);

		td.closest('table').find('colgroup col').first()
			.after('<col class="gmailsdk__compose_actionToolbarColumn"></col><col class="gmailsdk__compose_separatorColumn"></col>');

		return $("<div/>").appendTo(td);
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
