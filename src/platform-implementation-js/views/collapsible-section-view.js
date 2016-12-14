/* @flow */

import _ from 'lodash';
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
		.filter(function(event){
			return event.eventName === 'rowClicked';
		})
		.onValue(function({rowDescriptor}){
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
		.onValue(function({sectionDescriptor}){
			if(sectionDescriptor.onTitleLinkClick){
				sectionDescriptor.onTitleLinkClick(collapsibleSectionView);
			}
		});

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'footerClicked';
		})
		.onValue(function({sectionDescriptor}){
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
