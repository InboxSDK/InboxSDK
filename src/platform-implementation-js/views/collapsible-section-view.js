/* @flow */

import {defn} from 'ud';
import RSVP from 'rsvp';
import EventEmitter from '../lib/safe-event-emitter';
import get from '../../common/get-or-fail';
import type {Driver} from '../driver-interfaces/driver';
import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';

const membersMap = new WeakMap();

// documented in src/docs/
class CollapsibleSectionView extends EventEmitter {
	destroyed: boolean;

	constructor(collapsibleSectionViewDriver: GmailCollapsibleSectionView, driver: Driver) {
		super();
		const members = {collapsibleSectionViewDriver};
		membersMap.set(this, members);

		this.destroyed = false;
		_bindToEventStream(this, collapsibleSectionViewDriver, driver);
	}

	setCollapsed(value: boolean) {
		get(membersMap, this).collapsibleSectionViewDriver.setCollapsed(value);
	}

	remove(){
		this.destroy();
	}

	destroy(){
		const members = get(membersMap, this);
		members.collapsibleSectionViewDriver.destroy();
		this.removeAllListeners();
	}
}

function _bindToEventStream(collapsibleSectionView, collapsibleSectionViewDriver, driver){
	collapsibleSectionViewDriver
		.getEventStream()
		.onValue(({eventName}) => {collapsibleSectionView.emit(eventName);});

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(({eventName}) => eventName === 'rowClicked')
		.onValue(({rowDescriptor}) => {
			if(rowDescriptor.routeID){
				driver.goto(rowDescriptor.routeID, rowDescriptor.routeParams);
			}

			if(typeof rowDescriptor.onClick === 'function'){
				rowDescriptor.onClick();
			}
		});

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(({eventName}) => eventName === 'titleLinkClicked')
		.onValue(({sectionDescriptor}) => {
			if(sectionDescriptor.onTitleLinkClick){
				sectionDescriptor.onTitleLinkClick(collapsibleSectionView);
			}
		});

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(({eventName}) => eventName === 'footerClicked')
		.onValue(({sectionDescriptor}) => {
			if(sectionDescriptor.onFooterLinkClick){
				sectionDescriptor.onFooterLinkClick(collapsibleSectionView);
			}
		});

	collapsibleSectionViewDriver.getEventStream().onEnd(() => {
		collapsibleSectionView.destroyed = true;
		collapsibleSectionView.emit('destroy');
	});
}

export default defn(module, CollapsibleSectionView);
