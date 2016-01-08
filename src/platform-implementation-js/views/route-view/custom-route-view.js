/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import RouteView from './route-view';
import type {RouteViewDriver} from '../../driver-interfaces/route-view-driver';
import get from '../../../common/get-or-fail';

// documented in src/docs/
class CustomRouteView extends RouteView {
	constructor(routeViewDriver: RouteViewDriver) {
		super(routeViewDriver);

		const members = {routeViewDriver};
		membersMap.set(this, members);
	}

	getElement(): HTMLElement {
		const el = get(membersMap, this).routeViewDriver.getCustomViewElement();
		if (!el) throw new Error("Should not happen");
		return el;
	}
}

const membersMap: WeakMap<CustomRouteView, {routeViewDriver: RouteViewDriver}> = new WeakMap();

export default defn(module, CustomRouteView);
