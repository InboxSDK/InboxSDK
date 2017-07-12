/* @flow */

import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import get from '../../common/get-or-fail';
import NavItemView from '../views/nav-item-view';
import NativeNavItemView from '../views/native-nav-item-view';

import type {Driver} from '../driver-interfaces/driver';

const memberMap = new WeakMap();

export default class NavMenu {
	NavItemTypes: Object;
	SENT_MAIL: NativeNavItemView;

	constructor(appId: string, driver: Driver){
		const members = {appId, driver, navItemViews: []};
		memberMap.set(this, members);

		this.SENT_MAIL = _setupSentMail(appId, driver);
		this.NavItemTypes = require('../constants/nav-item-types');
	}

	addNavItem(navItemDescriptor: Object): NavItemView {
		const members = get(memberMap, this);
		const navItemDescriptorPropertyStream = kefirCast((Kefir: any), navItemDescriptor).toProperty();

		const navItemView = new NavItemView(members.appId, members.driver, navItemDescriptorPropertyStream);

		const navItemViewDriver = members.driver.addNavItem(members.appId, navItemDescriptorPropertyStream);
		navItemView.setNavItemViewDriver(navItemViewDriver);

		members.navItemViews.push(navItemView);
		return navItemView;
	}

	static SENT_MAIL: ?Object = null;
}

function _setupSentMail(appId, driver){
	const nativeNavItemView = new NativeNavItemView(appId, driver, 'sent');

	driver.getSentMailNativeNavItem().then(function(sentMailNavItemViewDriver){
		nativeNavItemView.setNavItemViewDriver(sentMailNavItemViewDriver);
	});

	return nativeNavItemView;
}
