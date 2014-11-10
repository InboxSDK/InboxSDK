var _ = require('lodash');
var $ = require('jquery');

var ToolbarViewDriver = require('../../../driver-interfaces/toolbar-view-driver');

var ButtonView = require('../widgets/buttons/button-view');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');
var MenuButtonViewController = require('../../../widgets/buttons/menu-button-view-controller');

var MenuView = require('../widgets/menu-view');

var GmailToolbarView = function(element){
	ToolbarViewDriver.call(this);

	this._element = element;
};

GmailToolbarView.prototype = Object.create(ToolbarViewDriver.prototype);

_.extend(GmailToolbarView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_threadViewDriver', destroy: false, set: true, get: true},
		{name: '_rowListViewDriver', destroy: false, set: true, get: true},
		{name: '_buttonViewControllers', destroy: true, defaultValue: []}
	],

	setThreadViewDriver: function(threadViewDriver){
		this._threadViewDriver = threadViewDriver;

		this._element.setAttribute('data-thread-toolbar', 'true');
	},

	setRowListViewDriver: function(rowListViewDriver){
		this._rowListViewDriver = rowListViewDriver;

		this._element.setAttribute('data-rowlist-toolbar', 'true');
	},


	addButton: function(buttonDescriptor){
		var buttonViewController = this._createButtonViewController(buttonDescriptor);
		this._buttonViewControllers.push(buttonViewController);

		var sectionElement = this._getSectionElement(buttonDescriptor.section);
		sectionElement.appendChild(buttonViewController.getView().getElement());

		this._updateButtonClasses(this._element);
	},

	_createButtonViewController: function(buttonDescriptor){
		var buttonView = this._getButtonView(buttonDescriptor);
		buttonDescriptor.buttonView = buttonView;

		var buttonViewController = null;
		if(buttonDescriptor.hasDropdown){
			buttonDescriptor.menuView = new MenuView();
			buttonViewController = new MenuButtonViewController(buttonDescriptor);
		}
		else{
			buttonViewController = new BasicButtonViewController(buttonDescriptor);
		}

		return buttonViewController;
	},

	_getButtonView: function(buttonDescriptor){
		var buttonView = new ButtonView(buttonDescriptor);

		if(this._rowListViewDriver){
			buttonView.getElement().setAttribute('data-rowlist-toolbar', 'true');
		}
		else if(this._threadViewDriver){
			buttonView.getElement().setAttribute('data-thread-toolbar', 'true');
		}

		buttonView.getElement().setAttribute('role', 'button');

		return buttonView;
	},

	_getSectionElement: function(section){
		var sectionElements = this._element.querySelectorAll('.G-Ni');
		var buttonSearchClass = null;

		switch(section){
			case 'ARCHIVE_GROUP':
				buttonSearchClass = 'ar9';
			break;
			case 'MOVE_GROUP':
				buttonSearchClass = 'asb';
			break;
			default:
				return null;
			break;
		}

		for(var ii=0; ii<sectionElements.length; ii++){
			if(!!sectionElements[ii].querySelector('.' + buttonSearchClass)){
				return sectionElements[ii];
			}
		}

		return null;
	},

	_updateButtonClasses: function(element){
		var buttons = element.querySelectorAll('.G-Ni > [role=button]');

		Array.prototype.forEach.call(buttons, function(button){

			if(button.previousElementSibling && $(button.previousElementSibling).is(':visible')){
				button.classList.add('T-I-Js-Gs');
			}
			else{
				button.classList.remove('T-I-Js-Gs');
			}

			if(button.nextElementSibling && $(button.nextElementSibling).is(':visible')){
				button.classList.add('T-I-Js-IF');
			}
			else{
				button.classList.remove('T-I-Js-IF');
			}

		});
	},

	destroy: function(){
		var element = this._element;
		if(this._threadViewDriver){
			this._element.removeAttribute('data-thread-toolbar');
		}
		else if(this._rowListViewDriver){
			this._element.removeAttribute('data-rowlist-toolbar');
		}

		ToolbarViewDriver.prototype.destroy.call(this);
		this._updateButtonClasses(element);
	}

});

module.exports = GmailToolbarView;
