/* @flow */

import {defn} from 'ud';
import RouteView from './route-view';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import CollapsibleSectionView from '../collapsible-section-view';
import SectionView from '../section-view';
import get from '../../../common/get-or-fail';
import type {RouteViewDriver} from '../../driver-interfaces/route-view-driver';
import type {Driver} from '../../driver-interfaces/driver';

// documented in src/docs/
class ListRouteView extends RouteView {
	constructor(routeViewDriver: RouteViewDriver, driver: Driver, appId: string) {
		super(routeViewDriver);

		const members = {
			routeViewDriver, driver, appId,
			sectionViews: []
		};
		membersMap.set(this, members);

		_bindToEventStream(routeViewDriver, this);
	}

	addCollapsibleSection(collapsibleSectionDescriptor: ?Object): CollapsibleSectionView {
		const members = get(membersMap, this);

		const collapsibleSectionViewDriver = members.routeViewDriver.addCollapsibleSection(kefirCast((Kefir: any), collapsibleSectionDescriptor).toProperty(), members.appId);
		const collapsibleSectionView = new CollapsibleSectionView(collapsibleSectionViewDriver, members.driver);

		members.sectionViews.push(collapsibleSectionView);
		return collapsibleSectionView;
	}

	addSection(sectionDescriptor: ?Object): SectionView {
		const members = get(membersMap, this);

		const sectionViewDriver = members.routeViewDriver.addSection(kefirCast((Kefir: any), sectionDescriptor).toProperty(), members.appId);
		const sectionView = new SectionView(sectionViewDriver, members.driver);

		members.sectionViews.push(sectionView);
		return sectionView;
	}

	refresh() {
		get(membersMap, this).routeViewDriver.refresh();
	}
}

const membersMap = new WeakMap();

function _bindToEventStream(routeViewDriver, routeView){
	routeViewDriver.getEventStream().onEnd(() => {
		const members = get(membersMap, routeView);

		members.sectionViews.forEach(sectionView => {
			sectionView.destroy();
		});
	});
}

export default defn(module, ListRouteView);
