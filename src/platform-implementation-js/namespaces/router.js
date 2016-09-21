/* @flow */

import _ from 'lodash';
import RSVP from 'rsvp';

import HandlerRegistry from '../lib/handler-registry';

import RouteView from '../views/route-view/route-view';
import ListRouteView from '../views/route-view/list-route-view';
import CustomRouteView from '../views/route-view/custom-route-view';
import DummyRouteViewDriver from '../views/route-view/dummy-route-view-driver';
import type Membrane from '../lib/Membrane';

import type {Driver} from '../driver-interfaces/driver';
import type {Handler} from '../lib/handler-registry';

const memberMap = new WeakMap();

const SAMPLE_RATE = 0.01;

// documented in src/docs/
class Router {
	static NativeRouteIDs: Object;
	static NativeListRouteIDs: Object;
	static RouteTypes: Object;

	constructor(appId: string, driver: Driver, membrane: Membrane){
		const members = {
			appId, driver,
			currentRouteViewDriver: new DummyRouteViewDriver(),
			allRoutesHandlerRegistry: new HandlerRegistry(),
			customRoutes: [],
			membrane,
			listRouteHandlerRegistries: {}
		};
		_.forOwn(NATIVE_LIST_ROUTE_IDS, value => {
			members.listRouteHandlerRegistries[value] = new HandlerRegistry();
		});
		memberMap.set(this, members);

		driver.getRouteViewDriverStream().onValue(routeViewDriver => {
			driver.getLogger().trackFunctionPerformance(
				() => _handleRouteViewChange(this, members, routeViewDriver),
				SAMPLE_RATE,
				{
					type: 'handleRouteViewChange',
					hash: routeViewDriver.getHash()
				}
			)
		});

		driver.getStopper().onValue(function() {
			members.allRoutesHandlerRegistry.dumpHandlers();
			_.forOwn(members.listRouteHandlerRegistries, reg => {
				reg.dumpHandlers();
			});
		});
	}

	createLink(routeID: string, params?: ?Object): string {
		return memberMap.get(this).driver.createLink(routeID, params);
	}

	goto(routeID: string, params?: ?Object){
		memberMap.get(this).driver.goto(routeID, params);
	}

	handleCustomRoute(routeID: string, handler: HandlerRegistry<CustomRouteView>): () => void {
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
	}

	handleAllRoutes(handler: Handler<any>): () => void {
		return memberMap.get(this).allRoutesHandlerRegistry.registerHandler(handler);
	}

	handleListRoute(routeID: string, handler: Handler<ListRouteView>): () => void {
		var listRouteHandlerRegistries = memberMap.get(this).listRouteHandlerRegistries;
		if(!listRouteHandlerRegistries[routeID]){
			throw new Error('Invalid routeID specified');
		}

		return listRouteHandlerRegistries[routeID].registerHandler(handler);
	}

	handleCustomListRoute(routeID: string, handler: Function): () => void {
		return memberMap.get(this).driver.addCustomListRouteID(routeID, handler);
	}

	getCurrentRouteView(): RouteView {
		var members = memberMap.get(this);
		return members.membrane.get(members.currentRouteViewDriver);
	}

}

const NATIVE_ROUTE_IDS = Object.freeze({
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

var NATIVE_LIST_ROUTE_IDS = Object.freeze({
	'INBOX': NATIVE_ROUTE_IDS.INBOX,
	'ALL_MAIL': NATIVE_ROUTE_IDS.ALL_MAIL,
	'SENT': NATIVE_ROUTE_IDS.SENT,
	'STARRED': NATIVE_ROUTE_IDS.STARRED,
	'DRAFTS': NATIVE_ROUTE_IDS.DRAFTS,
	'SNOOZED': NATIVE_ROUTE_IDS.SNOOZED,
	'DONE': NATIVE_ROUTE_IDS.DONE,
	'REMINDERS': NATIVE_ROUTE_IDS.REMINDERS,
	'LABEL': NATIVE_ROUTE_IDS.LABEL,
	'TRASH': NATIVE_ROUTE_IDS.TRASH,
	'SPAM': NATIVE_ROUTE_IDS.SPAM,
	'IMPORTANT': NATIVE_ROUTE_IDS.IMPORTANT,
	'SEARCH': NATIVE_ROUTE_IDS.SEARCH,
	'ANY_LIST': NATIVE_ROUTE_IDS.ANY_LIST
});

var ROUTE_TYPES = Object.freeze({
	'LIST': 'LIST',
	'THREAD': 'THREAD',
	'SETTINGS': 'SETTINGS',
	'CHAT': 'CHAT',
	'CUSTOM': 'CUSTOM',
	'UNKNOWN': 'UNKNOWN'
});


function _handleRouteViewChange(router, members, routeViewDriver){
	if (members.currentRouteViewDriver instanceof DummyRouteViewDriver) {
		members.currentRouteViewDriver.destroy();
	}

	members.currentRouteViewDriver = routeViewDriver;
	const routeView = members.membrane.get(routeViewDriver);

	_updateNavMenu(members, routeViewDriver);

	if(routeView.getRouteType() === ROUTE_TYPES.CUSTOM){
		_informRelevantCustomRoutes(members, routeViewDriver, routeView);
	}

	members.allRoutesHandlerRegistry.addTarget(routeView);

	if(routeView.getRouteType() === ROUTE_TYPES.LIST){
		var listRouteView = new ListRouteView(routeViewDriver, members.driver, members.appId);

		var listRouteHandlerRegistry = members.listRouteHandlerRegistries[routeView.getRouteID()];
		if (listRouteHandlerRegistry) {
			listRouteHandlerRegistry.addTarget(listRouteView);
		}
		members.listRouteHandlerRegistries[NATIVE_ROUTE_IDS.ANY_LIST].addTarget(listRouteView);
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
	members.driver.setShowNativeNavMarker(newRouteViewDriver.getType() !== ROUTE_TYPES.CUSTOM);
}

Router.NativeRouteIDs = (Router: any).prototype.NativeRouteIDs = NATIVE_ROUTE_IDS;
Router.NativeListRouteIDs = (Router: any).prototype.NativeListRouteIDs = NATIVE_LIST_ROUTE_IDS;
Router.RouteTypes = (Router: any).prototype.RouteTypes = ROUTE_TYPES;

export default Router;
