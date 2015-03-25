var _ = require('lodash');
var Bacon = require('baconjs');
var RSVP = require('rsvp');
var EventEmitter = require('events').EventEmitter;
var baconCast = require('bacon-cast');

var memberMap = new WeakMap();

/**
* @class
* NavItemsViews are the elements placed inside a NavMenu. Each NavItemView
* represents an entry in the left navigation of Gmail or Inbox. These NavItemViews
* can be nested.
*
* Typically the main action of a NavItemView is performed when the user clicks on the
* main text. However, you can also provide accessories which are secondary actions which
* typically appear on the right side of the NavItemView but may be rendered in other ways.

* For nested NavItemViews, the SDK will handle collapsing and expanding children depending
* on user input.
*/
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

_.extend(NavItemView.prototype, /** @lends NavItemView */ {

	/**
	* Add a nested child NavItemView
	* @param {NavItemDescriptor} navItemDescriptor - a single descriptor for the nav item or stream of NavItemDescriptors
	* @return {NavItemView}
	*/
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
		if(!members.driver){
			members.deferred.resolve(navItemViewDriver);
			return; //we have been removed already
		}

		members.navItemViewDriver = navItemViewDriver;

		Bacon.combineAsArray(
			members.navItemDescriptorPropertyStream,
			navItemViewDriver.getEventStream()
		)
			.sampledBy(navItemViewDriver.getEventStream())
			.onValue(_handleViewDriverStreamEvent, this, navItemViewDriver, members.driver);

		Bacon.combineAsArray(
			members.driver
				.getRouteViewDriverStream()
				.takeUntil(navItemViewDriver.getEventStream().filter(false).mapEnd()),

			members.navItemDescriptorPropertyStream
		).onValue(_handleRouteViewChange, navItemViewDriver);

		members.deferred.resolve(navItemViewDriver);
	},

	/**
	* Remove this NavItemView from its parent
	*/
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

	/**
	* Whether the NavItemView is currently collapsed and hiding its children
	* @return {boolean}
	*/
	isCollapsed: function(){
		if(memberMap.get(this).navItemViewDriver){
			return memberMap.get(this).navItemViewDriver.isCollapsed();
		}
		else{
			return false;
		}
	},

	/**
	* Collapse or uncollapse this NavItemView
	* @param {boolean} collapseValue - whether to collapse or uncollapse
	*/
	setCollapsed: function(collapseValue){
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

function _handleRouteViewChange(navItemViewDriver, [routeViewDriver, navItemDescriptor]){
	navItemViewDriver.setActive(
		navItemDescriptor &&
		routeViewDriver.getRouteID() === navItemDescriptor.routeID &&
		_.isEqual(navItemDescriptor.routeParams || {}, routeViewDriver.getParams())
	);
}

module.exports = NavItemView;
