var _ = require('lodash');
var Bacon = require('baconjs');
var RSVP = require('rsvp');
var EventEmitter = require('events').EventEmitter;
var baconCast = require('bacon-cast');

var Map = require('es6-unweak-collections').Map;

var memberMap = new Map();

var NavItemView = function(appId, driver, navItemDescriptorPropertyStream){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
	members.navItemDescriptorPropertyStream = navItemDescriptorPropertyStream;
	members.deferred = RSVP.defer();
	members.navItemViews = [];
};

NavItemView.prototype = Object.create(EventEmitter.prototype);

_.extend(NavItemView.prototype, {

	addNavItem: function(navItemDescriptor){
		var members = memberMap.get(this);
		var navItemDescriptorPropertyStream = baconCast(Bacon, navItemDescriptor).toProperty();
		var navItemView = new NavItemView(members.appId, members.driver, navItemDescriptorPropertyStream);

		members.deferred.promise.then(function(navItemViewDriver){
			var childNavItemViewDriver = navItemViewDriver.addNavItem(members.appId, navItemDescriptorPropertyStream);
			navItemView.setNavItemViewDriver(childNavItemViewDriver);
		});


		members.navItemViews.push(navItemView);
		return navItemView;
	},

	setNavItemViewDriver: function(navItemViewDriver){
		var members = memberMap.get(this);
		members.navItemViewDriver = navItemViewDriver;

		Bacon.combineAsArray(
			members.navItemDescriptorPropertyStream,
			navItemViewDriver.getEventStream().toProperty()
		).onValue(_handleViewDriverStreamEvent, this, navItemViewDriver, members.driver);

		Bacon.combineAsArray(
			members.driver
				.getRouteViewDriverStream().delay(10)
				.takeUntil(navItemViewDriver.getEventStream().filter(false).mapEnd())
				.toProperty(),

			members.navItemDescriptorPropertyStream
		).onValue(_handleRouteViewChange, navItemViewDriver);

		members.deferred.resolve(navItemViewDriver);
	},

	remove: function(){
		var members = memberMap.get(this);
		if(!members.navItemViews){
			return;
		}

		members.navItemViews.forEach(function(navItemView){
			navItemView.remove();
		});

		members.navItemViews = null;

		members.appId = null;
		members.driver = null;

		members.deferred.promise.then(function(navItemViewDriver){
			navItemViewDriver.destroy();
			members.navItemViewDriver = null;
		});
	},

	isCollapsed: function(){
		if(memberMap.get(this).navItemViewDriver){
			return memberMap.get(this).navItemViewDriver.isCollapsed();
		}
		else{
			return false;
		}
	},

	setCollapsed: function(collapseValue){
		memberMap.get(this).deferred.promise.then(function(navItemViewDriver){
			navItemViewDriver.setCollapsed(collapseValue);
		});
	}

});


function _handleViewDriverStreamEvent(eventEmitter, navItemViewDriver, driver, params){
	var navItemDescriptor = params[0];
	var event = params[1];

	switch(event.eventName){
		case 'mouseenter':

			if(navItemDescriptor.routeID){
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

			if(navItemDescriptor.routeID){
				driver.goto(navItemDescriptor.routeID, navItemDescriptor.routeParams);
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
		routeViewDriver.doesMatchRouteID(navItemDescriptor.routeID) &&
		_.isEqual(navItemDescriptor.routeParams || {}, routeViewDriver.getParams(navItemDescriptor.routeID))
	);
}

module.exports = NavItemView;
