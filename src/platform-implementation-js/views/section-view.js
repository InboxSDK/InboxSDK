/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import RSVP from 'rsvp';
import EventEmitter from '../lib/safe-event-emitter';
import type {Driver} from '../driver-interfaces/driver';
import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';

const membersMap = new WeakMap();

// documented in src/docs/
class SectionView extends EventEmitter {
	destroyed: boolean;

	constructor(sectionViewDriver: GmailCollapsibleSectionView, driver: Driver) {
		super();
		const members = {sectionViewDriver};
		membersMap.set(this, members);

		this.destroyed = false;
		_bindToEventStream(this, sectionViewDriver, driver);
	}

	remove(){
		this.destroy();
	}

	destroy(){
		const members = membersMap.get(this);
		members.sectionViewDriver.destroy();
		this.removeAllListeners();
	}
}


function _bindToEventStream(sectionView, sectionViewDriver, driver){
	sectionViewDriver
		.getEventStream()
		.map(e => e.eventName)
		.onValue(sectionView, 'emit');

	sectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'rowClicked';
		})
		.map(e => e.rowDescriptor)
		.onValue(function(rowDescriptor){
			if(rowDescriptor.routeID){
				driver.goto(rowDescriptor.routeID, rowDescriptor.routeParams);
			}

			if(_.isFunction(rowDescriptor.onClick)){
				rowDescriptor.onClick();
			}
		});

	sectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'summaryClicked';
		})
		.map(e => e.sectionDescriptor)
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onTitleLinkClick){
				sectionDescriptor.onTitleLinkClick(sectionView);
			}
		});

	sectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'footerClicked';
		})
		.map(e => e.sectionDescriptor)
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onFooterLinkClick){
				sectionDescriptor.onFooterLinkClick(sectionView);
			}
		});

	sectionViewDriver.getEventStream().onEnd(() => {
		sectionView.destroyed = true;
		sectionView.emit('destroy');
	});
}

export default defn(module, SectionView);
