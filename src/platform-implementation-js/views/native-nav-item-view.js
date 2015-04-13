'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');

var EventEmitter = require('events').EventEmitter;

var Bacon = require('baconjs');
var baconCast = require('bacon-cast');

var NavItemView = require('./nav-item-view');

var memberMap = new WeakMap();

var NativeNavItemView = function(appId, driver, labelName){
	EventEmitter.call(this);
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
	members.labelName = labelName;
	members.deferred = RSVP.defer();

	members.navItemViews = [];
};

NativeNavItemView.prototype = Object.create(EventEmitter.prototype);

_.extend(NativeNavItemView.prototype, {

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
		if(!navItemViewDriver){
			return;
		}

		var members = memberMap.get(this);

		members.navItemViewDriver = navItemViewDriver;
		navItemViewDriver.getEventStream().onValue(_handleStreamEvent, this);

		members.deferred.resolve(navItemViewDriver);
	},

	isCollapsed: function(){
		return localStorage['inboxsdk__nativeNavItem__state_' + memberMap.get(this).labelName] === 'collapsed';
	},

	setCollapsed: function(collapseValue){
		var members = memberMap.get(this);

		if(members.navItemViewDriver){
			members.navItemViewDriver.setCollapsed(collapseValue);
		}
		else{
			localStorage['inboxsdk__nativeNavItem__state_' + members.labelName] = collapseValue ? 'collapsed' : 'expanded';
		}
	}

});

function _handleStreamEvent(emitter, event){
	switch(event.eventName){
		case 'expanded':
		case 'collapsed':
			emitter.emit(event.eventName);
		break;
	}
}

module.exports = NativeNavItemView;
