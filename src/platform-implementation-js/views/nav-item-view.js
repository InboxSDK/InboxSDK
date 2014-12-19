var _ = require('lodash');
var BasicClass = require('../lib/basic-class');
var Bacon = require('baconjs');

var convertForeignInputToBacon = require('../lib/convert-foreign-input-to-bacon');

var NavItemView = function(appId, driver, navItemViewDriver, navItemDescriptorPropertyStream){
	BasicClass.call(this);

	this._appId = appId;
	this._driver = driver;
	this._navItemViewDriver = navItemViewDriver;
	this._eventStream = new Bacon.Bus();

	Bacon.combineAsArray(
		navItemDescriptorPropertyStream,
		this._navItemViewDriver.getEventStream().toProperty()
	).onValue(this, '_handleViewDriverStreamEvent');

	Bacon.combineAsArray(
		this._driver
			.getRouteViewDriverStream()
			.takeUntil(this._navItemViewDriver.getEventStream().filter(false).mapEnd())
			.takeUntil(navItemDescriptorPropertyStream.filter(false).mapEnd())
			.toProperty(),

		navItemDescriptorPropertyStream
	).onValue(this, '_handleRouteViewChange');
};

NavItemView.prototype = Object.create(BasicClass.prototype);

_.extend(NavItemView.prototype, {

	__memberVariables:[
		{name: '_appId', destroy: false},
		{name: '_driver', destroy: false},
		{name: '_navItemViewDriver', destroy: true},
		{name: '_navItemDescriptor', destroy: false},
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

	remove: function(){
		this._navItemViewDriver.remove();
		this.destroy();
	},

	isCollapsed: function(){
		return this._navItemViewDriver.isCollapsed();
	},

	setCollapsed: function(collapseValue){
		this._navItemViewDriver.setCollapsed(collapseValue);
	},

	_handleViewDriverStreamEvent: function(params){
		var navItemDescriptor = params[0];
		var event = params[1];

		switch(event.eventName){
			case 'mouseenter':

				if(navItemDescriptor.routeName){
					this._navItemViewDriver.setHighlight(true);
				}

			break;
			case 'mouseleave':

				this._navItemViewDriver.setHighlight(false);

			break;
			case 'click':

				if(navItemDescriptor.onClick){
					navItemDescriptor.onClick();
				}

				if(navItemDescriptor.routeName){
					this._driver.gotoView(navItemDescriptor.routeName, navItemDescriptor.routeParams);
				}
				else{
					this._navItemViewDriver.toggleCollapse();
				}

			break;
			case 'expanded':
			case 'collapsed':
				this._eventStream.push(event);
			break;
		}
	},

	_handleRouteViewChange: function(paramHolder){
		var routeViewDriver = paramHolder[0];
		var navItemDescriptor = paramHolder[1];

		this._navItemViewDriver.setActive(
			navItemDescriptor &&
			navItemDescriptor.routeName === routeViewDriver.getName() &&
			_.isEqual(navItemDescriptor.routeParams, routeViewDriver.getParams())
		);
	}

});

module.exports = NavItemView;
