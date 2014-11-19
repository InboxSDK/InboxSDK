var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');
var RSVP = require('rsvp');

var containByScreen = require('../../lib/dom/contain-by-screen');

var MenuButtonViewController = function(options){
	BasicClass.call(this);

	this._preMenuShowFunction = options.preMenuShowFunction;
	this._postMenuShowFunction = options.postMenuShowFunction;
	this._preMenuHideFunction = options.preMenuHideFunction;
	this._postMenuHideFunction = options.postMenuHideFunction;

	this._menuView = options.menuView;
	this._menuView.getElement().style.position = 'fixed';

	this._view = options.buttonView;
	this._menuPositionOptions = options.menuPositionOptions;

	this._bindToViewEvents();
};

MenuButtonViewController.prototype = Object.create(BasicClass.prototype);

_.extend(MenuButtonViewController.prototype, {

	__memberVariables: [
		{name: '_view', destroy: true, get: true},
		{name: '_preMenuShowFunction', destroy: false, set: true},
		{name: '_postMenuShowFunction', destroy: false, set: true},
		{name: '_preMenuHideFunction', destroy: false, set: true},
		{name: '_postMenuHideFunction', destroy: false, set: true},
		{name: '_menuState', destroy: true, defaultValue: 'HIDDEN'},
		{name: '_transitionPromise', destroy: false},
		{name: '_menuView', destroy: true},
		{name: '_menuPositionOptions', destroy: true},
		{name: '_focusFunction', destroy: false}
	],

	showMenu: function(){
		if(this._transitionPromise){
			var self = this;
			this._transitionPromise.finally(function(){
				self.showMenu();
			});
		}
		else{
			this._showMenu();
		}
	},

	hideMenu: function(){
		if(this._transitionPromise){
			var self = this;
			this._transitionPromise.finally(function(){
				self.hideMenu();
			});
		}
		else{
			this._hideMenu();
		}
	},

	isMenuVisible: function(){
		return this._menuState === 'VISIBLE';
	},

	_bindToViewEvents: function(){
		var self = this;
		this._view
			.getEventStream()
			.filter(function(event){
				return event.eventName === 'click';
			})
			.onValue(function(){
				self._toggleMenuState();
			});

		this._view
			.getEventStream()
			.filter(function(event){
				return event.eventName === 'keydown' && event.domEvent.which === 27; //escape
			})
			.onValue(this, 'hideMenu');
	},

	_toggleMenuState: function(){
		var self = this;

		if(this._transitionPromise){
			this._transitionPromise.finally(function(){
				self._toggleMenuState();
			});
			return;
		}


		if(this._menuState === 'HIDDEN'){
			this._showMenu();
		}
		else{
			this._hideMenu();
		}
	},

	_showMenu: function(){
		var deferred = RSVP.defer();
		this._transitionPromise = deferred.promise;

		this._menuState = 'VISIBLE';

		if(_.isFunction(this._preMenuShowFunction)){
			this._preMenuShowFunction(this._menuView);
		}

		this._view.activate();
		document.body.appendChild(this._menuView.getElement());

		if(isNaN(this._menuView.getElement().getAttribute('tabindex'))){
			this._menuView.getElement().setAttribute('tabindex', -1);
		}

		if(this._menuView.focus){
			this._menuView.focus();
		}
		else{
			this._menuView.getElement().focus();
		}

		this._startMonitoringFocusEvents();

		if(_.isFunction(this._postMenuShowFunction)){
			this._postMenuShowFunction(this._menuView, this);
		}

		_.delay(containByScreen, 1, this._menuView.getElement(), this._view.getElement(), this._menuPositionOptions);
		this._transitionPromise = null;

		deferred.resolve();
	},

	_hideMenu: function(){
		var deferred = RSVP.defer();
		this._transitionPromise = deferred.promise;

		this._menuState = 'HIDDEN';

		if(_.isFunction(this._preMenuHideFunction)){
			this._preMenuHideFunction(this._menuView);
		}

		this._view.deactivate();
		this._menuView.getElement().remove();

		if(_.isFunction(this._postMenuHideFunction)){
			this._postMenuHideFunction(this._menuView);
		}

		this._transitionPromise = null;
		this._stopMonitoringFocusEvents();
		deferred.resolve();
	},

	_startMonitoringFocusEvents: function(){
		var self = this;

		var menuElement = this._menuView.getElement();
		var buttonElement = this._view.getElement();

		this._focusFunction = function(event){
			var focusedElement = event.target;

			var checkElement = focusedElement;
			for(var ii=0; ii<100; ii++){
				if(checkElement === null){
					self.hideMenu();
					return;
				}

				if(checkElement === menuElement || checkElement === buttonElement){
					return;
				}

				checkElement = checkElement.parentElement;
			}
		};

		document.addEventListener(
			'focus',
			this._focusFunction,
			true
		);
	},

	_stopMonitoringFocusEvents: function(){
		document.removeEventListener('focus', this._focusFunction, true);
	},

	destroy: function(){
		this._stopMonitoringFocusEvents();
		BasicClass.prototype.destroy.call(this);
	}

});

module.exports = MenuButtonViewController;
