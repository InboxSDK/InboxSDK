'use strict';

var _ = require('lodash');
var $ = require('jquery');
var Bacon = require('baconjs');

var waitFor = require('../../../lib/wait-for');

var ToolbarViewDriver = require('../../../driver-interfaces/toolbar-view-driver');

var ButtonView = require('../widgets/buttons/button-view');
var GmailDropdownView = require('../widgets/gmail-dropdown-view');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');
var DropdownButtonViewController = require('../../../widgets/buttons/dropdown-button-view-controller');

var GmailDropdownView = require('../widgets/gmail-dropdown-view');

var GmailToolbarView = function(element, routeViewDriver){
	ToolbarViewDriver.call(this);

	this._element = element;
	this._routeViewDriver = routeViewDriver;

	var self = this;
	this._ready = waitFor(function(){
		// Resolve if we're destroyed, so that this waitFor doesn't ever wait forever.
		return !self._element || !!self._getArchiveSectionElement();
	}).then(function(){
		return self;
	});

	this._ready.then(function(){
		if (!self._element) return;
		self._determineToolbarState();
		self._setupToolbarStateMonitoring();
 	});

 	this._eventStream = new Bacon.Bus();
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
		{name: '_routeViewDriver', destroy: false, get: true},
		{name: '_classMutationObsever', destroy: true, destroyFunction: 'disconnect'},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'}
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


	addButton: function(buttonDescriptor, toolbarSections){
		var self = this;
		this._ready.then(
			function(){
				if (!self._element) return;

				if(buttonDescriptor.section === toolbarSections.MORE){
					//do something different
				}
				else{
					var sectionElement = self._getSectionElement(buttonDescriptor.section, toolbarSections);

					var buttonViewController = self._createButtonViewController(buttonDescriptor);
					self._buttonViewControllers.push(buttonViewController);

					sectionElement.appendChild(buttonViewController.getView().getElement());

					self._updateButtonClasses(self._element);
				}
			}
		);
	},

	waitForReady: function() {
		return Bacon.fromPromise(this._ready);
	},

	_createButtonViewController: function(buttonDescriptor){
		var buttonView = this._getButtonView(buttonDescriptor);
		buttonDescriptor.buttonView = buttonView;

		var buttonViewController = null;
		if(buttonDescriptor.hasDropdown){
			buttonViewController = new DropdownButtonViewController({
				buttonView: buttonView,
				dropdownViewDriverClass: GmailDropdownView,
				dropdownShowFunction: buttonDescriptor.onClick,
				dropdownPositionOptions: {
					isRightAligned: true
				}
			});
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
			buttonView.getElement().setAttribute('data-toolbar-expanded', 'true');
		}
		else if(this._threadViewDriver){
			buttonView.getElement().setAttribute('data-thread-toolbar', 'true');
		}

		buttonView.getElement().setAttribute('role', 'button');

		return buttonView;
	},

	_determineToolbarState: function(){
		var sectionElement = this._getArchiveSectionElement();

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
			this._getArchiveSectionElement(),
			{attributes: true, attributeFilter: ['style']}
		);
	},

	_getSectionElement: function(sectionName, toolbarSections){
		if(!this._element){
			return null;
		}

		switch(sectionName){
			case toolbarSections.CHECKBOX:
				return this._getCheckboxSectionElement();

			case toolbarSections.ARCHIVE:
				return this._getArchiveSectionElement();

			case toolbarSections.MOVE:
				return this._getMoveSectionElement();

			default:
				return null;
		}
	},

	_getArchiveSectionElement: function(){
		return this._getSectionElementForButtonSelector('.ar9, .aFh, .aFj');
	},

	_getCheckboxSectionElement: function(){
		return this._getSectionElementForButtonSelector('.T-Jo-auh');
	},

	_getMoveSectionElement: function(){
		return this._getSectionElementForButtonSelector('.asb, .ase');
	},

	_getSectionElementForButtonSelector: function(buttonSelector){
		var sectionElements = this._element.querySelectorAll('.G-Ni');

		for(var ii=0; ii<sectionElements.length; ii++){
			if(!!sectionElements[ii].querySelector(buttonSelector)){
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
