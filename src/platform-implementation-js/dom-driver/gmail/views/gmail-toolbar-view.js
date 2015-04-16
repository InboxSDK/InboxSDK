'use strict';

var _ = require('lodash');
var $ = require('jquery');
var Bacon = require('baconjs');

var waitFor = require('../../../lib/wait-for');
var makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');
var getInsertBeforeElement = require('../../../lib/dom/get-insert-before-element');

var ToolbarViewDriver = require('../../../driver-interfaces/toolbar-view-driver');

var GmailElementGetter = require('../gmail-element-getter');

var ButtonView = require('../widgets/buttons/button-view');
var GmailDropdownView = require('../widgets/gmail-dropdown-view');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');
var DropdownButtonViewController = require('../../../widgets/buttons/dropdown-button-view-controller');

var GmailDropdownView = require('../widgets/gmail-dropdown-view');

var GmailToolbarView = function(element, routeViewDriver){
	ToolbarViewDriver.call(this);

	this._element = element;
	this._routeViewDriver = routeViewDriver;
	this._eventStream = new Bacon.Bus();
	this._eventStream.onValue(_.noop); // Work-around: don't ignore .end() calls made before listeners are added.

	var self = this;
	this._ready = waitFor(function(){
		// Resolve if we're destroyed, so that this waitFor doesn't ever wait forever.
		return !self._element || !!self._getMoveSectionElement();
	}).then(function(){
		return self;
	});

	this._ready.then(function(){
		if (!self._element) return;
		self._startMonitoringMoreMenu();
		self._determineToolbarState();
		self._determineToolbarIconMode();
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
		{name: '_routeViewDriver', destroy: false, get: true},
		{name: '_moreMenuItems', destroy: false, defaultValue: []},
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


	addButton: function(buttonDescriptor, toolbarSections, appId){
		var self = this;
		this._ready.then(
			function(){
				if (!self._element) return;

				if(buttonDescriptor.section === toolbarSections.OTHER){
					self._moreMenuItems.push({
						buttonDescriptor: buttonDescriptor,
						appId: appId
					});
					self._addToOpenMoreMenu(buttonDescriptor, appId);
				}
				else{
					var sectionElement = self._getSectionElement(buttonDescriptor.section, toolbarSections);
					if (sectionElement) {
						var buttonViewController = self._createButtonViewController(buttonDescriptor);
						self._buttonViewControllers.push(buttonViewController);

						sectionElement.appendChild(buttonViewController.getView().getElement());

						self._updateButtonClasses(self._element);
						buttonViewController.getView().setEnabled(self._toolbarState === 'EXPANDED');
					}
				}
			}
		);
	},

	waitForReady: function() {
		return Bacon.fromPromise(this._ready)
			.takeUntil(this._eventStream.filter(false).mapEnd());
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

	_startMonitoringMoreMenu: function(){
		var moreButtonElement = this._element.querySelector('.nf[role=button]');
		if(!moreButtonElement){
			return;
		}

		var self = this;
		makeMutationObserverStream(moreButtonElement, {attributes: true, attributeFilter: ['aria-expanded']})
			.takeUntil(this._eventStream.filter(false).mapEnd())
			.map(function(){
				return moreButtonElement.getAttribute('aria-expanded');
			})
			.startWith(moreButtonElement.getAttribute('aria-expanded'))
			.filter(function(ariaExpanded){
				return ariaExpanded === 'true';
			})
			.onValue(this, '_addMoreItems');

	},

	_determineToolbarState: function(){
		var sectionElement = this._getMoveSectionElement();

		if(sectionElement.style.display === 'none'){
			this._toolbarState = 'COLLAPSED';
		}
		else{
			this._toolbarState = 'EXPANDED';
		}
	},

	_determineToolbarIconMode: function(){
		var sectionElement = this._getMoveSectionElement();
		if(sectionElement && sectionElement.querySelector('[role=button]').textContent.trim().length  === 0){
			this._element.setAttribute('data-toolbar-icononly', 'true');
		}
		else{
			this._element.setAttribute('data-toolbar-icononly', 'false');
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
			self._updateButtonEnabledState();
		});

		this._classMutationObsever.observe(
			this._getMoveSectionElement(),
			{attributes: true, attributeFilter: ['style']}
		);
	},

	_getSectionElement: function(sectionName, toolbarSections){
		if(!this._element){
			return null;
		}

		switch(sectionName){
			case toolbarSections.INBOX_STATE:
				return this._getArchiveSectionElement();

			case toolbarSections.METADATA_STATE:
				return this._getMoveSectionElement();

			default:
				return null;
		}
	},

	_getArchiveSectionElement: function(){
		return this._getSectionElementForButtonSelector('.ar9, .aFh, .aFj, .lR, .nN, .nX');
	},

	_getCheckboxSectionElement: function(){
		return this._getSectionElementForButtonSelector('.T-Jo-auh');
	},

	_getMoveSectionElement: function(){
		return this._getSectionElementForButtonSelector('.asb, .ase, .ns, .mw');
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
		else if(this._toolbarState === 'COLLAPSED'){
			element.setAttribute('data-toolbar-expanded', 'false');
		}

		var buttons = element.querySelectorAll('.G-Ni > [role=button]');

		Array.prototype.forEach.call(buttons, function(button){
			var current = button;
			for(var ii=0; ii<100000; ii++){
				if(current.previousElementSibling){
					if(current.previousElementSibling.classList.contains('inboxsdk__button')){
						if($(current.previousElementSibling).is(':visible')){
							button.classList.add('T-I-Js-Gs');
							break;
						}
						else{
							current = current.previousElementSibling;
						}
					}
					else{
						button.classList.add('T-I-Js-Gs');
						break;
					}
				}
				else{
					button.classList.remove('T-I-Js-Gs');
					break;
				}
			}

			current = button;
			for(ii=0; ii<100000; ii++){
				if(current.nextElementSibling){
					if(current.nextElementSibling.classList.contains('inboxsdk__button')){
						if($(current.nextElementSibling).is(':visible')){
							button.classList.add('T-I-Js-IF');
							break;
						}
						else{
							current = current.nextElementSibling;
						}
					}
					else{
						button.classList.add('T-I-Js-IF');
						break;
					}
				}
				else{
					button.classList.remove('T-I-Js-IF');
					break;
				}
			}

		});
	},

	_updateButtonEnabledState: function(){
		var enabled = this._toolbarState === 'EXPANDED';
		this._buttonViewControllers.forEach(function(buttonViewController){
			buttonViewController.getView().setEnabled(enabled);
		});
	},

	_addMoreItems: function(){
		var self = this;

		this._clearMoreItems();

		if(this._toolbarState !== 'EXPANDED'){
			return;
		}

		this._moreMenuItems.forEach(function(item){
			self._addToOpenMoreMenu(item.buttonDescriptor, item.appId);
		});
	},

	_clearMoreItems: function(){
		var moreMenu = GmailElementGetter.getActiveMoreMenu();
		if(!moreMenu){
			return;
		}

		_.chain(this._moreMenuItems)
			.pluck('appId')
			.uniq()
			.map(function(appId){
				return moreMenu.querySelector('[data-group-order-hint=' + appId + ']');
			})
			.compact()
			.each(function(container){
				container.remove();
			}).value();
	},

	_addToOpenMoreMenu: function(buttonDescriptor, appId){
		var moreMenu = GmailElementGetter.getActiveMoreMenu();
		if(!moreMenu){
			return;
		}

		var appDiv = this._getMoreMenuItemsContainer(moreMenu, appId);
		var menuItemElement = this._getMoreMenuItemElement(buttonDescriptor);

		var insertBeforeElement = getInsertBeforeElement(menuItemElement, appDiv.querySelectorAll('[role=menuitem]'), ['data-order-hint']);

		if(insertBeforeElement){
			appDiv.insertBefore(menuItemElement, insertBeforeElement);
		}
		else{
			appDiv.appendChild(menuItemElement);
		}
	},

	_getMoreMenuItemsContainer: function(moreMenu, appId){
		var container = moreMenu.querySelector('[data-group-order-hint=' + appId + ']');
		if(container){
			return container;
		}

		container = document.createElement('div');
		container.setAttribute('data-group-order-hint', appId);
		container.innerHTML = '<div class="J-Kh"></div>';

		var containers = moreMenu.querySelectorAll('[data-group-order-hint]');
		var insertBeforeElement = getInsertBeforeElement(container, containers, ['data-group-order-hint']);

		if(insertBeforeElement){
			moreMenu.insertBefore(container, insertBeforeElement);
		}
		else{
			moreMenu.appendChild(container);
		}

		return container;
	},

	_getMoreMenuItemElement: function(buttonDescriptor){
		var itemElement = document.createElement('div');
		itemElement.setAttribute('class', 'J-N inboxsdk__menuItem');
		itemElement.setAttribute('role', 'menuitem');
		itemElement.setAttribute('orderHint', buttonDescriptor.orderHint || 0);

		itemElement.innerHTML = [
			'<div class="J-N-Jz" style="-webkit-user-select: none;">',
				 buttonDescriptor.iconUrl ? '<img src="' + buttonDescriptor.iconUrl + '" />' : '',
				 buttonDescriptor.iconClass ? '<span class="inboxsdk__icon ' + buttonDescriptor.iconClass + '"></span>' : '',
				_.escape(buttonDescriptor.title),
			'</div>'
		].join('');

		itemElement.addEventListener('mouseenter', function(){
			itemElement.classList.add('J-N-JT');
		});

		itemElement.addEventListener('mouseleave', function(){
			itemElement.classList.remove('J-N-JT');
		});

		itemElement.addEventListener('click', function(){

			if(buttonDescriptor.onClick){
				buttonDescriptor.onClick();
			}

		});

		return itemElement;
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

		this._clearMoreItems();
		ToolbarViewDriver.prototype.destroy.call(this);
		this._updateButtonClasses(element);
	}

});

module.exports = GmailToolbarView;
