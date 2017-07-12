/* @flow */

import {defn, defonce} from 'ud';
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

	setFullWidth(fullWidth: boolean) {
		const {routeViewDriver} = get(membersMap, this);
		routeViewDriver.setFullWidth(fullWidth);
	}

	getElement(): HTMLElement {
		const {routeViewDriver} = get(membersMap, this);
		const el = routeViewDriver.getCustomViewElement();
		if (!el) throw new Error("Should not happen");
		return el;
	}
}

const membersMap = defonce(module, () => new WeakMap());

export default defn(module, CustomRouteView);
