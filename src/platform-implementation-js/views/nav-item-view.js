/* @flow */

import isEqual from 'lodash/isEqual';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import RSVP from 'rsvp';
import get from '../../common/get-or-fail';
import EventEmitter from '../lib/safe-event-emitter';

import NAV_ITEM_TYPES from '../constants/nav-item-types';

import type {Driver} from '../driver-interfaces/driver';

const memberMap = new WeakMap();

// documented in src/docs/

export default class NavItemView extends EventEmitter {
	destroyed: boolean = false;

	constructor(appId: string, driver: Driver, navItemDescriptorPropertyStream: Object){
		super();

		var members = {};
		memberMap.set(this, members);

		members.appId = appId;
		members.driver = driver;
		members.navItemDescriptorPropertyStream = navItemDescriptorPropertyStream;
		members.deferred = RSVP.defer();
		members.navItemViews = [];

		driver.getStopper().onValue(this.remove.bind(this));
	}

	addNavItem(navItemDescriptor: Object): NavItemView {
		const members = memberMap.get(this);
		if(!members || !members.driver || !members.appId || !members.navItemViews) throw new Error('this nav item view does not exist');
		const driver = members.driver;
		const appId = members.appId;
		const navItemViews = members.navItemViews;

		var navItemDescriptorPropertyStream = kefirCast(Kefir, navItemDescriptor).toProperty();
		var navItemView = new NavItemView(appId, driver, navItemDescriptorPropertyStream);

		members.deferred.promise.then(function(navItemViewDriver){
			var childNavItemViewDriver = navItemViewDriver.addNavItem(members.appId, navItemDescriptorPropertyStream);
			navItemView.setNavItemViewDriver(childNavItemViewDriver);
		});

		navItemViews.push(navItemView);
		return navItemView;
	}

	// TODO make this not a public method
	setNavItemViewDriver(navItemViewDriver: Object){
		const members = get(memberMap, this);

		if(!members.driver){
			members.deferred.resolve(navItemViewDriver);
			return; //we have been removed already
		}
		const driver = members.driver;
		members.navItemViewDriver = navItemViewDriver;

		members.navItemDescriptorPropertyStream.sampledBy(
				navItemViewDriver.getEventStream(), (a, b) => [a, b]
			)
			.onValue(navItemDescriptor => _handleViewDriverStreamEvent(this, navItemViewDriver, driver, navItemDescriptor));

		Kefir.combine([
				members.navItemDescriptorPropertyStream,
				driver.getRouteViewDriverStream()
			])
			.takeUntilBy(navItemViewDriver.getEventStream().filter(() => false).beforeEnd(() => null))
			.onValue(x => {
				_handleRouteViewChange(navItemViewDriver, x);
			});

		members.deferred.resolve(navItemViewDriver);
	}

	remove(){
		const members = memberMap.get(this);
		if(!members || !members.navItemViews || !members.driver || !members.navItemViews){
			return;
		}
		const {appId, navItemViews} = members;

		this.destroyed = true;
		this.emit('destroy');

		navItemViews.forEach(function(navItemView){
			navItemView.remove();
		});

		members.navItemViews = null;

		members.appId = null;
		members.driver = null;

		members.deferred.promise.then(navItemViewDriver => {
			navItemViewDriver.destroy();
			members.navItemViewDriver = null;
		});
	}

	isCollapsed(): boolean {
		const members = memberMap.get(this);
		if(!members){
			return false;
		}
		const navItemViewDriver = members.navItemViewDriver;

		if(navItemViewDriver){
			return navItemViewDriver.isCollapsed();
		}
		else{
			return false;
		}
	}

	setCollapsed(collapseValue: boolean){
		get(memberMap, this).deferred.promise.then(navItemViewDriver => {
			navItemViewDriver.setCollapsed(collapseValue);
		});
	}

}



function _handleViewDriverStreamEvent(eventEmitter, navItemViewDriver, driver, [navItemDescriptor, event]){
	switch(event.eventName){
		case 'click':

			// When in Gmailv2, we ignore the onClick, routeID, and routeParams options on GROUPER nav-items
			if (navItemDescriptor.type === NAV_ITEM_TYPES.GROUPER && typeof driver.isUsingMaterialUI === 'function' && driver.isUsingMaterialUI()) return;

			if (typeof navItemDescriptor.onClick === 'function') {
				let defaultPrevented = false;
				const syntheticEvent = {
					preventDefault() { defaultPrevented = true; }
				};

				navItemDescriptor.onClick(syntheticEvent);

				if (defaultPrevented) {
					break;
				}
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
		isEqual(navItemDescriptor.routeParams || {}, routeViewDriver.getParams())
	);
}
