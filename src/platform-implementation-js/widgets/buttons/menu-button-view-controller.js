var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');
var RSVP = require('rsvp');

var containByScreen = require('../../lib/dom/contain-by-screen');
var BodyClickBinder = require('../../lib/dom/body-click-binder');

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
		{name: '_bodyClickBinder', destroy: true},
		{name: '_menuPositionOptions', destroy: true}
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
		containByScreen(this._menuView.getElement(), this._view.getElement(), this._menuPositionOptions);

		if(_.isFunction(this._postMenuShowFunction)){
			this._postMenuShowFunction(this._menuView);
		}

		if(!this._bodyClickBinder){
			this._bodyClickBinder = new BodyClickBinder(function(){
				this.hideMenu();
			}.bind(this));
		}

		this._bodyClickBinder.bind();
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
		document.body.removeChild(this._menuView.getElement());

		if(_.isFunction(this._postMenuHideFunction)){
			this._postMenuHideFunction(this._menuView);
		}

		if(this._bodyClickBinder){
			this._bodyClickBinder.unbind();
		}

		this._transitionPromise = null;
		deferred.resolve();
	}

});

module.exports = MenuButtonViewController;
