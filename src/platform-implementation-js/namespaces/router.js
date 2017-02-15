/* @flow */

import _ from 'lodash';
import {defn, defonce} from 'ud';

import HandlerRegistry from '../lib/handler-registry';
import get from '../../common/get-or-fail';
import RouteView from '../views/route-view/route-view';
import ListRouteView from '../views/route-view/list-route-view';
import CustomRouteView from '../views/route-view/custom-route-view';
import DummyRouteViewDriver from '../views/route-view/dummy-route-view-driver';
import type Membrane from '../lib/Membrane';
import {NATIVE_ROUTE_IDS, NATIVE_LIST_ROUTE_IDS, ROUTE_TYPES} from '../constants/router';

import type {Driver} from '../driver-interfaces/driver';
import type {Handler} from '../lib/handler-registry';

const memberMap = defonce(module, () => new WeakMap());

const SAMPLE_RATE = 0.01;

// documented in src/docs/
class Router {
	NativeRouteIDs = NATIVE_ROUTE_IDS;
	NativeListRouteIDs = NATIVE_LIST_ROUTE_IDS;
	RouteTypes = ROUTE_TYPES;

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
					routeID: routeViewDriver.getRouteID()
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
		return get(memberMap, this).driver.createLink(routeID, params);
	}

	goto(routeID: string, params?: ?Object){
		const {driver} = get(memberMap, this);
		if (_.isString(params)) {
			driver.getLogger().deprecationWarning(
				'Router.goto param string',
				'param object (e.g. {param: value})'
			)
		}
		driver.goto(routeID, params);
	}

	handleCustomRoute(routeID: string, handler: HandlerRegistry<CustomRouteView>): () => void {
		const customRouteDescriptor = {
			routeID: routeID,
			onActivate: handler
		};

		const removeCustomRouteFromDriver = get(memberMap, this).driver.addCustomRouteID(routeID);
		const {customRoutes, driver} = get(memberMap, this);

		customRoutes.push(customRouteDescriptor);

		driver.getLogger().eventSdkPassive('Router.handleCustomRoute');

		return function(){
			removeCustomRouteFromDriver();
			const index = customRoutes.indexOf(customRouteDescriptor);
			if(index > -1){
				customRoutes.splice(index, 1);
			}
		};
	}

	handleAllRoutes(handler: Handler<any>): () => void {
		return get(memberMap, this).allRoutesHandlerRegistry.registerHandler(handler);
	}

	handleListRoute(routeID: string, handler: Handler<ListRouteView>): () => void {
		const {listRouteHandlerRegistries} = get(memberMap, this);
		if(!listRouteHandlerRegistries[routeID]){
			throw new Error('Invalid routeID specified');
		}

		return listRouteHandlerRegistries[routeID].registerHandler(handler);
	}

	handleCustomListRoute(routeID: string, handler: Function): () => void {
		return get(memberMap, this).driver.addCustomListRouteID(routeID, handler);
	}

	getCurrentRouteView(): RouteView {
		const members = get(memberMap, this);
		return members.membrane.get(members.currentRouteViewDriver);
	}

}

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
		const listRouteView = new ListRouteView(routeViewDriver, members.driver, members.appId);

		const listRouteHandlerRegistry = members.listRouteHandlerRegistries[routeView.getRouteID()];
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
		const customViewElement = routeViewDriver.getCustomViewElement();
		if (!customViewElement) throw new Error('should not happen');
		members.driver.showCustomRouteView(customViewElement);
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

export default defn(module, Router);
