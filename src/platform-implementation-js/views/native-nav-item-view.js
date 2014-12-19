var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var NativeNavItemView = function(appId, driver, navItemViewDriver){
	BasicClass.call(this);

	this._appId = appId;
	this._driver = driver;
	this._navItemViewDriver = navItemViewDriver;
	this._eventStream = new Bacon.Bus();

	this._navItemViewDriver.getEventStream().onValue(this, '_handleStreamEvent');
};

NativeNavItemView.prototype = Object.create(BasicClass.prototype);

_.extend(NativeNavItemView.prototype, {

	__memberVariables:[
		{name: '_appId', destroy: false},
		{name: '_driver', destroy: false},
		{name: '_navItemViewDriver', destroy: true},
		{name: '_navItemViews', destroy: true, defaultValue: []},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'}
	],

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
				this._eventStream.push(event);
			break;
		}
	}

});

module.exports = NativeNavItemView;
