var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var convertForeignInputToBacon = require('../lib/convert-foreign-input-to-bacon');

var NavItemView = require('./nav-item-view');

var NativeNavItemView = function(appId, driver, navItemViewDriver){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;
	this._navItemViewDriver = navItemViewDriver;
	this._navItemViews = [];

	this._navItemViewDriver.getEventStream().onValue(this, '_handleStreamEvent');
};

NativeNavItemView.prototype = Object.create(EventEmitter.prototype);

_.extend(NativeNavItemView.prototype, {

	addNavItem: function(navItemDescriptor){
		var navItemDescriptorPropertyStream = convertForeignInputToBacon(navItemDescriptor).toProperty();

		var navItemViewDriver = this._navItemViewDriver.addNavItem(this._appId, navItemDescriptorPropertyStream);
		var navItemView = new NavItemView(this._appId, this._driver, navItemViewDriver, navItemDescriptorPropertyStream);

		this._navItemViews.push(navItemView);

		return navItemView;
	},

	isCollapsed: function(){
		return this._navItemViewDriver.isCollapsed();
	},

	setCollapsed: function(collapseValue){
		this._navItemViewDriver.setCollapsed(collapseValue);
	},

	_handleStreamEvent: function(event){
		switch(event.eventName){
			case 'expanded':
			case 'collapsed':
				this.emit(event.eventName);
			break;
		}
	}

});

module.exports = NativeNavItemView;
