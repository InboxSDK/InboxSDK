var _ = require('lodash');
var $ = require('jquery');

var waitFor = require('../../../lib/wait-for');

var ToolbarViewDriver = require('../../../driver-interfaces/toolbar-view-driver');

var ButtonView = require('../widgets/buttons/button-view');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');
var DropdownButtonViewController = require('../../../widgets/buttons/dropdown-button-view-controller');

var GmailDropdownView = require('../widgets/gmail-dropdown-view');

var GmailToolbarView = function(element){
	ToolbarViewDriver.call(this);

	this._element = element;

	var self = this;
	this._ready = waitFor(function(){
		// Resolve if we're destroyed, so that this waitFor doesn't ever wait forever.
		return !self._element || !!self._getSectionElement('ARCHIVE_GROUP');
	});

	this._ready.then(function(){
		if (!self._element) return;
		self._determineToolbarState();
		self._setupToolbarStateMonitoring();
	});
};

GmailToolbarView.prototype = Object.create(ToolbarViewDriver.prototype);

_.extend(GmailToolbarView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_threadViewDriver', destroy: false, set: true, get: true},
		{name: '_rowListViewDriver', destroy: false, set: true, get: true},
		{name: '_buttonViewControllers', destroy: true, defaultValue: []},
		{name: '_parentElement', destroy: false},
		{name: '_toolbarState', destroy: false},
		{name: '_classMutationObsever', destroy: true, destroyFunction: 'disconnect'}
	],

	setThreadViewDriver: function(threadViewDriver){
		this._threadViewDriver = threadViewDriver;

		var self = this;
		this._ready.then(function(){
			if (!self._element) return;
			self._element.setAttribute('data-thread-toolbar', 'true');
		});
	},

	setRowListViewDriver: function(rowListViewDriver){
		this._rowListViewDriver = rowListViewDriver;

		var self = this;
		this._ready.then(function(){
			if (!self._element) return;
			self._element.setAttribute('data-rowlist-toolbar', 'true');
		});
	},


	addButton: function(buttonDescriptor){
		var self = this;
		this._ready.then(
			function(){
				if (!self._element) return;
				var sectionElement = self._getSectionElement(buttonDescriptor.type);

				var buttonViewController = self._createButtonViewController(buttonDescriptor);
				self._buttonViewControllers.push(buttonViewController);

				sectionElement.appendChild(buttonViewController.getView().getElement());

				self._updateButtonClasses(self._element);
			}
		);
	},

	_createButtonViewController: function(buttonDescriptor){
		var buttonView = this._getButtonView(buttonDescriptor);
		buttonDescriptor.buttonView = buttonView;

		var buttonViewController = null;
		if(buttonDescriptor.hasDropdown){
			buttonDescriptor.dropdownViewDriver = new GmailDropdownView();
			buttonViewController = new DropdownButtonViewController(buttonDescriptor);
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

			if(buttonDescriptor.toolbarState === 'EXPANDED'){
				buttonView.getElement().setAttribute('data-toolbar-expanded', 'true');
			}
			else{
				buttonView.getElement().setAttribute('data-toolbar-expanded', 'false');
			}
		}
		else if(this._threadViewDriver){
			buttonView.getElement().setAttribute('data-thread-toolbar', 'true');
		}

		buttonView.getElement().setAttribute('role', 'button');

		return buttonView;
	},

	_determineToolbarState: function(){
		var sectionElement = this._getSectionElement('ARCHIVE_GROUP');

		if(sectionElement.style.display === 'none'){
			this._toolbarState = 'COLLAPSED';
		}
		else{
			this._toolbarState = 'EXPANDED';
		}
	},

	_setupToolbarStateMonitoring: function(){
		var self = this;
		this._classMutationObsever = new MutationObserver(function(mutations){
			if(mutations[0].target.style.display === 'none'){
				self._toolbarState = 'COLLAPSED';
			}
			else{
				self._toolbarState = 'EXPANDED';
			}

			self._updateButtonClasses(self._element);
		});

		this._classMutationObsever.observe(
			this._getSectionElement('ARCHIVE_GROUP'),
			{attributes: true, attributeFilter: ['style']}
		);
	},

	_getSectionElement: function(sectionName){
		if(!this._element){
			return null;
		}

		var sectionElements = this._element.querySelectorAll('.G-Ni');
		var buttonSearchClass = null;

		switch(sectionName){
			case 'CHECKBOX_GROUP':
				buttonSearchClass = 'T-Jo-auh';
			break;
			case 'ARCHIVE_GROUP':
				buttonSearchClass = 'ar9, .aFh, .aFj';
			break;
			case 'MOVE_GROUP':
				buttonSearchClass = 'asb, .asa';
			break;
			case 'REFRESH_GROUP':
				buttonSearchClass = 'asf';
			break;
			case 'MORE_GROUP':
				buttonSearchClass = 'Ykrj7b';
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
		if(!element){
			return;
		}

		if(this._toolbarState === 'EXPANDED'){
			element.setAttribute('data-toolbar-expanded', 'true');
		}
		else{
			element.setAttribute('data-toolbar-expanded', 'false');
		}

		var buttons = element.querySelectorAll('.G-Ni > [role=button]');

		Array.prototype.forEach.call(buttons, function(button){

			if(button.previousElementSibling){
				if(button.previousElementSibling.classList.contains('inboxsdk__button')){
					if($(button.previousElementSibling).is(':visible')){
						button.classList.add('T-I-Js-Gs');
					}
					else{
						button.classList.remove('T-I-Js-Gs');
					}
				}
				else{
					button.classList.add('T-I-Js-Gs');
				}
			}
			else {
				button.classList.remove('T-I-Js-Gs');
			}


			if(button.nextElementSibling){
				if(button.nextElementSibling.classList.contains('inboxsdk__button')){
					if($(button.nextElementSibling).is(':visible')){
						button.classList.add('T-I-Js-IF');
					}
					else{
						button.classList.remove('T-I-Js-IF');
					}
				}
				else{
					button.classList.add('T-I-Js-IF');
				}
			}
			else {
				button.classList.remove('T-I-Js-IF');
			}
		});
	},

	destroy: function(){
		var element = this._element;

		if(this._element){
			if(this._threadViewDriver){
				this._element.removeAttribute('data-thread-toolbar');
			}
			else if(this._rowListViewDriver){
				this._element.removeAttribute('data-rowlist-toolbar');
			}
		}


		ToolbarViewDriver.prototype.destroy.call(this);
		this._updateButtonClasses(element);
	}

});

module.exports = GmailToolbarView;
