var _ = require('lodash');
var Bacon = require('baconjs');
var RSVP = require('rsvp');
var EventEmitter = require('../lib/safe-event-emitter');
var baconCast = require('bacon-cast');

var memberMap = new WeakMap();

// documented in src/docs/
var NavItemView = function(appId, driver, navItemDescriptorPropertyStream){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
	members.navItemDescriptorPropertyStream = navItemDescriptorPropertyStream;
	members.deferred = RSVP.defer();
	members.navItemViews = [];

	driver.getStopper().onValue(this.remove.bind(this));
};

NavItemView.prototype = Object.create(EventEmitter.prototype);

_.extend(NavItemView.prototype, {

	addNavItem(navItemDescriptor){
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

	// TODO make this not a public method
	setNavItemViewDriver(navItemViewDriver){
		var members = memberMap.get(this);
		if(!members.driver){
			members.deferred.resolve(navItemViewDriver);
			return; //we have been removed already
		}

		members.navItemViewDriver = navItemViewDriver;

		members.navItemDescriptorPropertyStream.sampledBy(
				navItemViewDriver.getEventStream(), (a, b) => [a, b]
			)
			.onValue(_handleViewDriverStreamEvent, this, navItemViewDriver, members.driver);

		Bacon.combineAsArray(
			members.navItemDescriptorPropertyStream,
			members.driver.getRouteViewDriverStream()
		)
			.takeUntil(navItemViewDriver.getEventStream().filter(false).mapEnd())
			.onValue(x => {
				_handleRouteViewChange(navItemViewDriver, x);
			});

		members.deferred.resolve(navItemViewDriver);
	},

	remove(){
		var members = memberMap.get(this);
		if(!members.navItemViews){
			return;
		}

		this.emit('destroy');

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

	isCollapsed(){
		if(memberMap.get(this).navItemViewDriver){
			return memberMap.get(this).navItemViewDriver.isCollapsed();
		}
		else{
			return false;
		}
	},

	setCollapsed(collapseValue){
		memberMap.get(this).deferred.promise.then(function(navItemViewDriver){
			navItemViewDriver.setCollapsed(collapseValue);
		});
	}

});



function _handleViewDriverStreamEvent(eventEmitter, navItemViewDriver, driver, [navItemDescriptor, event]){
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

function _handleRouteViewChange(navItemViewDriver, [navItemDescriptor, routeViewDriver]){
	navItemViewDriver.setActive(
		navItemDescriptor &&
		routeViewDriver.getRouteID() === navItemDescriptor.routeID &&
		_.isEqual(navItemDescriptor.routeParams || {}, routeViewDriver.getParams())
	);
}

module.exports = NavItemView;
