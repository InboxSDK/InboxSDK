'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
import RSVP from 'rsvp';

var HandlerRegistry = require('../lib/handler-registry');

var RouteView = require('../views/route-view/route-view');
var ListRouteView = require('../views/route-view/list-route-view');
var CustomRouteView = require('../views/route-view/custom-route-view');

const memberMap = new WeakMap();

// documented in src/docs/
var Router = function(appId, driver, membraneMap){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;

	members.currentRouteViewDriver = null;

	members.allRoutesHandlerRegistry = new HandlerRegistry();

	members.customRoutes = [];

	members.membraneMap = membraneMap;

	members.listRouteHandlerRegistries = {};
	_.forOwn(this.NativeListRouteIDs, value => {
		members.listRouteHandlerRegistries[value] = new HandlerRegistry();
	});

	driver.getRouteViewDriverStream().onValue(_handleRouteViewChange, this, members);

	driver.getStopper().onValue(function() {
		members.allRoutesHandlerRegistry.dumpHandlers();
		_.forOwn(members.listRouteHandlerRegistries, reg => {
			reg.dumpHandlers();
		});
	});
};

_.extend(Router.prototype, {

	createLink(routeID, params){
		return memberMap.get(this).driver.createLink(routeID, params);
	},

	goto(routeID, params){
		memberMap.get(this).driver.goto(routeID, params);
	},

	handleCustomRoute(routeID, handler){
		var customRouteDescriptor = {
			routeID: routeID,
			onActivate: handler
		};

		var removeCustomRouteFromDriver = memberMap.get(this).driver.addCustomRouteID(routeID);
		var customRoutes = memberMap.get(this).customRoutes;
		customRoutes.push(customRouteDescriptor);

		return function(){
			removeCustomRouteFromDriver();
			var index = customRoutes.indexOf(customRouteDescriptor);
			if(index > -1){
				customRoutes.splice(index, 1);
			}
		};
	},

	handleAllRoutes(handler){
		return memberMap.get(this).allRoutesHandlerRegistry.registerHandler(handler);
	},

	handleListRoute(routeID, handler){
		var listRouteHandlerRegistries = memberMap.get(this).listRouteHandlerRegistries;
		if(!listRouteHandlerRegistries[routeID]){
			throw new Error('Invalid routeID specified');
		}

		return listRouteHandlerRegistries[routeID].registerHandler(handler);
	},

	handleCustomListRoute(routeID, handler) {
		return memberMap.get(this).driver.addCustomListRouteID(routeID, handler);
	},

	getCurrentRouteView(){
		var members = memberMap.get(this);
		return members.membraneMap.get(members.currentRouteViewDriver);
	}

});

var nativeRouteIDs = Object.freeze({
	'INBOX': 'inbox/:page',
	'ALL_MAIL': 'all/:page',
	'SENT': 'sent/:page',
	'STARRED': 'starred/:page',
	'DRAFTS': 'drafts/:page',
	'SNOOZED': 'snoozed',
	'DONE': 'done',
	'REMINDERS': 'reminders',
	'LABEL': 'label/:labelName/:page',
	'TRASH': 'trash/:page',
	'SPAM': 'spam/:page',
	'IMPORTANT': 'imp/:page',
	'SEARCH': 'search/:query/:page',
	'THREAD': 'inbox/:threadID',
	'CHATS': 'chats/:page',
	'CHAT': 'chats/:chatID',
	'CONTACTS': 'contacts/:page',
	'CONTACT': 'contacts/:contactID',
	'SETTINGS': 'settings/:section',
	'ANY_LIST': '*'
});

var nativeListRouteIDs = Object.freeze({
	'INBOX': nativeRouteIDs.INBOX,
	'ALL_MAIL': nativeRouteIDs.ALL_MAIL,
	'SENT': nativeRouteIDs.SENT,
	'STARRED': nativeRouteIDs.STARRED,
	'DRAFTS': nativeRouteIDs.DRAFTS,
	'SNOOZED': nativeRouteIDs.SNOOZED,
	'DONE': nativeRouteIDs.DONE,
	'REMINDERS': nativeRouteIDs.REMINDERS,
	'LABEL': nativeRouteIDs.LABEL,
	'TRASH': nativeRouteIDs.TRASH,
	'SPAM': nativeRouteIDs.SPAM,
	'IMPORTANT': nativeRouteIDs.IMPORTANT,
	'SEARCH': nativeRouteIDs.SEARCH,
	'ANY_LIST': nativeRouteIDs.ANY_LIST
});

var routeTypes = Object.freeze({
	'LIST': 'LIST',
	'THREAD': 'THREAD',
	'SETTINGS': 'SETTINGS',
	'CHAT': 'CHAT',
	'CUSTOM': 'CUSTOM',
	'UNKNOWN': 'UNKNOWN'
});


function _handleRouteViewChange(router, members, routeViewDriver){
	members.currentRouteViewDriver = routeViewDriver;
	var routeView = new RouteView(routeViewDriver, members.driver, members.appId);
	members.membraneMap.set(routeViewDriver, routeView);


	_updateNavMenu(members, routeViewDriver);

	if(routeView.getRouteType() === router.RouteTypes.CUSTOM){
		_informRelevantCustomRoutes(members, routeViewDriver, routeView);
	}

	members.allRoutesHandlerRegistry.addTarget(routeView);

	if(routeView.getRouteType() === routeTypes.LIST){
		var listRouteView = new ListRouteView(routeViewDriver, members.driver, members.appId);

		var listRouteHandlerRegistry = members.listRouteHandlerRegistries[routeView.getRouteID()];
		if (listRouteHandlerRegistry) {
			listRouteHandlerRegistry.addTarget(listRouteView);
		}
		members.listRouteHandlerRegistries[router.NativeRouteIDs.ANY_LIST].addTarget(listRouteView);
	}
}

function _informRelevantCustomRoutes(members, routeViewDriver, routeView){
	const routeID = routeView.getRouteID();
	const routeIDArray = Array.isArray(routeID) ? routeID : [routeID];
	const relevantCustomRoute = _.find(members.customRoutes, customRoute =>
		_.intersection(
			Array.isArray(customRoute.routeID) ? customRoute.routeID : [customRoute.routeID],
			routeIDArray
		).length
	);

	if (relevantCustomRoute) {
		const customRouteView = new CustomRouteView(routeViewDriver);

		members.driver.showCustomRouteView(routeViewDriver.getCustomViewElement());
		try {
			relevantCustomRoute.onActivate(customRouteView);
		} catch(err) {
			members.driver.getLogger().error(err);
		}
	}
}

function _updateNavMenu(members, newRouteViewDriver){
	members.driver.setShowNativeNavMarker(newRouteViewDriver.getType() !== routeTypes.CUSTOM);
}

Router.NativeRouteIDs = Router.prototype.NativeRouteIDs = nativeRouteIDs;
Router.NativeListRouteIDs = Router.prototype.NativeListRouteIDs = nativeListRouteIDs;
Router.RouteTypes = Router.prototype.RouteTypes = routeTypes;

module.exports = Router;
