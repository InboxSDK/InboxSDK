var _ = require('lodash');
var Bacon = require('baconjs');

var EventEmitter = require('events').EventEmitter;

var BasicClass = require('../lib/basic-class');


var convertForeignInputToBacon = require('../lib/convert-foreign-input-to-bacon');

var NavItemView = function(appId, driver, navItemViewDriver, navItemDescriptorPropertyStream){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;
	this._navItemViewDriver = navItemViewDriver;
	this._navItemViews = [];


	Bacon.combineAsArray(
		navItemDescriptorPropertyStream,
		this._navItemViewDriver.getEventStream().toProperty()
	).onValue(_handleViewDriverStreamEvent, this, this._navItemViewDriver, this._driver);

	Bacon.combineAsArray(
		this._driver
			.getRouteViewDriverStream()
			.takeUntil(this._navItemViewDriver.getEventStream().filter(false).mapEnd())
			.takeUntil(navItemDescriptorPropertyStream.filter(false).mapEnd())
			.toProperty(),

		navItemDescriptorPropertyStream
	).onValue(_handleRouteViewChange, this._navItemViewDriver);
};

NavItemView.prototype = Object.create(EventEmitter.prototype);

_.extend(NavItemView.prototype, {

	addNavItem: function(navItemDescriptor){
		var navItemDescriptorPropertyStream = convertForeignInputToBacon(navItemDescriptor).toProperty();

		var navItemViewDriver = this._navItemViewDriver.addNavItem(this._appId, navItemDescriptorPropertyStream);
		var navItemView = new NavItemView(this._appId, this._driver, navItemViewDriver, navItemDescriptorPropertyStream);

		this._navItemViews.push(navItemView);

		return navItemView;
	},

	remove: function(){
		if(!this._navItemViews){
			return;
		}

		this._navItemViews.forEach(function(navItemView){
			navItemView.remove();
		});

		this._navItemViews = null;

		this._navItemViewDriver.destroy();
		this._navItemViewDriver = null;

		this._appId = null;
		this._driver = null;
	},

	isCollapsed: function(){
		return this._navItemViewDriver.isCollapsed();
	},

	setCollapsed: function(collapseValue){
		this._navItemViewDriver.setCollapsed(collapseValue);
	}

});


function _handleViewDriverStreamEvent(eventEmitter, navItemViewDriver, driver, params){
	var navItemDescriptor = params[0];
	var event = params[1];

	switch(event.eventName){
		case 'mouseenter':

			if(navItemDescriptor.routeName){
				navItemViewDriver.setHighlight(true);
			}

		break;
		case 'mouseleave':

			navItemViewDriver.setHighlight(false);

		break;
		case 'click':

			if(navItemDescriptor.onClick){
				navItemDescriptor.onClick();
			}

			if(navItemDescriptor.routeName){
				driver.gotoView(navItemDescriptor.routeName, navItemDescriptor.routeParams);
			}
			else{
				navItemViewDriver.toggleCollapse();
			}

		break;
		case 'expanded':
		case 'collapsed':
			eventEmitter.emit(event.eventName);
		break;
	}
}

function _handleRouteViewChange(navItemViewDriver, paramHolder){
	var routeViewDriver = paramHolder[0];
	var navItemDescriptor = paramHolder[1];

	navItemViewDriver.setActive(
		navItemDescriptor &&
		navItemDescriptor.routeName === routeViewDriver.getName() &&
		_.isEqual(navItemDescriptor.routeParams, routeViewDriver.getParams())
	);
}

module.exports = NavItemView;
