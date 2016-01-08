/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import RouteView from './route-view';
import Bacon from 'baconjs';
import baconCast from 'bacon-cast';
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

		const collapsibleSectionViewDriver = members.routeViewDriver.addCollapsibleSection(baconCast(Bacon, collapsibleSectionDescriptor).toProperty(), members.appId);
		const collapsibleSectionView = new CollapsibleSectionView(collapsibleSectionViewDriver, members.driver);

		members.sectionViews.push(collapsibleSectionView);
		return collapsibleSectionView;
	}

	addSection(sectionDescriptor: ?Object): SectionView {
		const members = get(membersMap, this);

		const sectionViewDriver = members.routeViewDriver.addSection(baconCast(Bacon, sectionDescriptor).toProperty(), members.appId);
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
	routeViewDriver.getEventStream().onEnd(function(){
		const members = membersMap.get(routeView);

		members.sectionViews.forEach(function(sectionView){
			sectionView.destroy();
		});
	});
}

export default defn(module, ListRouteView);
