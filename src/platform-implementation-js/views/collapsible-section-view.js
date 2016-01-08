/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import RSVP from 'rsvp';
import EventEmitter from '../lib/safe-event-emitter';
import type {Driver} from '../driver-interfaces/driver';
import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';

const membersMap = new WeakMap();

// documented in src/docs/
class CollapsibleSectionView extends EventEmitter {
	constructor(collapsibleSectionViewDriver: GmailCollapsibleSectionView, driver: Driver) {
		super();
		const members = {collapsibleSectionViewDriver};
		membersMap.set(this, members);

		_bindToEventStream(this, collapsibleSectionViewDriver, driver);
	}

	setCollapsed(value: boolean) {
		membersMap.get(this).collapsibleSectionViewDriver.setCollapsed(value);
	}

	remove(){
		this.destroy();
	}

	destroy(){
		const members = membersMap.get(this);
		members.collapsibleSectionViewDriver.destroy();
		this.removeAllListeners();
	}
}

function _bindToEventStream(collapsibleSectionView, collapsibleSectionViewDriver, driver){
	collapsibleSectionViewDriver
		.getEventStream()
		.map('.eventName')
		.onValue(collapsibleSectionView, 'emit');

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'rowClicked';
		})
		.map('.rowDescriptor')
		.onValue(function(rowDescriptor){
			if(rowDescriptor.routeID){
				driver.goto(rowDescriptor.routeID, rowDescriptor.routeParams);
			}

			if(_.isFunction(rowDescriptor.onClick)){
				rowDescriptor.onClick();
			}
		});

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'titleLinkClicked';
		})
		.map('.sectionDescriptor')
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onTitleLinkClick){
				sectionDescriptor.onTitleLinkClick(collapsibleSectionView);
			}
		});

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'footerClicked';
		})
		.map('.sectionDescriptor')
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onFooterLinkClick){
				sectionDescriptor.onFooterLinkClick(collapsibleSectionView);
			}
		});

	collapsibleSectionViewDriver.getEventStream().onEnd(collapsibleSectionView, 'emit', 'destroy');
}

export default defn(module, CollapsibleSectionView);
