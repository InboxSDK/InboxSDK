/* @flow */

import RSVP from 'rsvp';
import EventEmitter from '../lib/safe-event-emitter';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import get from '../../common/get-or-fail';
import NavItemView from './nav-item-view';

import type {Driver} from '../driver-interfaces/driver';

const memberMap = new WeakMap();

export default class NativeNavItemView extends EventEmitter {

	constructor(appId: string, driver: Driver, labelName: string){
		super();

		const members = {
			appId, driver, labelName,
			deferred: RSVP.defer(),
			navItemViews: [],
			navItemViewDriver: (null: ?Object)
		};
		memberMap.set(this, members);
	}

	addNavItem(navItemDescriptor: Object): NavItemView {
		const members = get(memberMap, this);

		const navItemDescriptorPropertyStream = kefirCast((Kefir: any), navItemDescriptor).toProperty();
		const navItemView = new NavItemView(members.appId, members.driver, navItemDescriptorPropertyStream);

		members.deferred.promise.then(navItemViewDriver => {
			const childNavItemViewDriver = navItemViewDriver.addNavItem(members.appId, navItemDescriptorPropertyStream);
			navItemView.setNavItemViewDriver(childNavItemViewDriver);
		});

		members.navItemViews.push(navItemView);
		return navItemView;
	}

	setNavItemViewDriver(navItemViewDriver: Object){
		if(!navItemViewDriver){
			return;
		}

		const members = get(memberMap, this);

		members.navItemViewDriver = navItemViewDriver;
		navItemViewDriver.getEventStream().onValue((event) => _handleStreamEvent(this, event));

		members.deferred.resolve(navItemViewDriver);
	}

	isCollapsed(): boolean {
		return localStorage.getItem('inboxsdk__nativeNavItem__state_' + get(memberMap, this).labelName) === 'collapsed';
	}

	setCollapsed(collapseValue: boolean ){
		const members = get(memberMap, this);

		if(members.navItemViewDriver){
			members.navItemViewDriver.setCollapsed(collapseValue);
		}
		else{
			localStorage.setItem('inboxsdk__nativeNavItem__state_' + members.labelName, collapseValue ? 'collapsed' : 'expanded');
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
