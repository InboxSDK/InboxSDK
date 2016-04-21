/* @flow */

import _ from 'lodash';
import RSVP from 'rsvp';

import EventEmitter from '../lib/safe-event-emitter';

import Kefir from 'kefir';
import kefirCast from 'kefir-cast';

import NavItemView from './nav-item-view';

import type {Driver} from '../driver-interfaces/driver';

const memberMap = new WeakMap();

export default class NativeNavItemView extends EventEmitter {

	constructor(appId: string, driver: Driver, labelName: string){
		super();

		var members = {};
		memberMap.set(this, members);

		members.appId = appId;
		members.driver = driver;
		members.labelName = labelName;
		members.deferred = RSVP.defer();

		members.navItemViews = [];
	}

	addNavItem(navItemDescriptor: Object): NavItemView {
		var members = memberMap.get(this);

		var navItemDescriptorPropertyStream = kefirCast(Kefir, navItemDescriptor).toProperty();
		var navItemView = new NavItemView(members.appId, members.driver, navItemDescriptorPropertyStream);

		members.deferred.promise.then(function(navItemViewDriver){
			var childNavItemViewDriver = navItemViewDriver.addNavItem(members.appId, navItemDescriptorPropertyStream);
			navItemView.setNavItemViewDriver(childNavItemViewDriver);
		});

		members.navItemViews.push(navItemView);
		return navItemView;
	}

	setNavItemViewDriver(navItemViewDriver: Object){
		if(!navItemViewDriver){
			return;
		}

		var members = memberMap.get(this);

		members.navItemViewDriver = navItemViewDriver;
		navItemViewDriver.getEventStream().onValue((event) => _handleStreamEvent(this, event));

		members.deferred.resolve(navItemViewDriver);
	}

	isCollapsed(): boolean {
		return localStorage['inboxsdk__nativeNavItem__state_' + memberMap.get(this).labelName] === 'collapsed';
	}

	setCollapsed(collapseValue: boolean ){
		var members = memberMap.get(this);

		if(members.navItemViewDriver){
			members.navItemViewDriver.setCollapsed(collapseValue);
		}
		else{
			localStorage['inboxsdk__nativeNavItem__state_' + members.labelName] = collapseValue ? 'collapsed' : 'expanded';
		}
	}

}

function _handleStreamEvent(emitter, event){
	switch(event.eventName){
		case 'expanded':
		case 'collapsed':
			emitter.emit(event.eventName);
		break;
	}
}
