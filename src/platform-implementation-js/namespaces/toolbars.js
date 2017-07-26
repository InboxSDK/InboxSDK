/* @flow */

import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import kefirStopper from 'kefir-stopper';
import EventEmitter from '../lib/safe-event-emitter';
import type {Driver} from '../driver-interfaces/driver';
import type {PiOpts} from '../platform-implementation';
import type Membrane from '../lib/Membrane';
import get from '../../common/get-or-fail';
import AppToolbarButtonView from '../views/app-toolbar-button-view';
import {SECTION_NAMES} from '../constants/toolbars';

type Members = {|
	appId: string;
	driver: Driver;
	membrane: Membrane;
	piOpts: PiOpts;
|};

const memberMap: WeakMap<Toolbars, Members> = new WeakMap();

// documented in src/docs/
export default class Toolbars extends EventEmitter {
	SectionNames = SECTION_NAMES;

	constructor(appId: string, driver: Driver, membrane: Membrane, piOpts: PiOpts) {
		super();
		const members = {
			appId, driver, membrane, piOpts
		};
		memberMap.set(this, members);
	}

	registerThreadButton(buttonDescriptor: Object) {
		const members = get(memberMap, this);
		const stopper = kefirStopper();
		const {hideFor, ..._buttonDescriptor} = buttonDescriptor;
		const sub = members.driver.getRouteViewDriverStream().takeUntilBy(stopper).onValue(routeViewDriver => {
			if (hideFor) {
				const routeView = members.membrane.get(routeViewDriver);
				if (hideFor(routeView)) {
					return;
				}
			}

			const remove = members.driver.registerThreadButton({..._buttonDescriptor, onClick: event => {
				if (!_buttonDescriptor.onClick) return;
				_buttonDescriptor.onClick({
					position: event.position,
					dropdown: event.dropdown,
					selectedThreadViews: event.selectedThreadViewDrivers.map(x => members.membrane.get(x)),
					selectedThreadRowViews: event.selectedThreadRowViewDrivers.map(x => members.membrane.get(x)),
				});
			}});
			routeViewDriver.getStopper().merge(stopper).take(1).onValue(() => {
				remove();
			});
		});
		return () => {
			stopper.destroy();
		};
	}

	registerToolbarButtonForList(buttonDescriptor: Object){
		const members = get(memberMap, this);
		if (buttonDescriptor.section === 'OTHER' && buttonDescriptor.hasDropdown) {
			members.driver.getLogger().errorApp(new Error('registerToolbarButtonForList does not support section=OTHER and hasDropdown=true together'));
			buttonDescriptor = {...buttonDescriptor, hasDropdown: false};
		}
		return this.registerThreadButton({
			positions: ['LIST'],
			listSection: buttonDescriptor.section,

			title: buttonDescriptor.title,
			iconUrl: buttonDescriptor.iconUrl,
			iconClass: buttonDescriptor.iconClass,
			onClick: event => {
				if (!buttonDescriptor.onClick) return;
				buttonDescriptor.onClick({
					dropdown: event.dropdown,
					selectedThreadRowViews: event.selectedThreadRowViews,
					get threadRowViews() {
						members.driver.getLogger().deprecationWarning(
							'Toolbars.registerToolbarButtonForList onClick event.threadRowViews');
						return event.selectedThreadRowViews;
					}
				});
			},
			hasDropdown: buttonDescriptor.hasDropdown,
			hideFor: buttonDescriptor.hideFor,
			keyboardShortcutHandle: buttonDescriptor.keyboardShortcutHandle
		});
	}

	registerToolbarButtonForThreadView(buttonDescriptor: Object){
		const members = get(memberMap, this);
		if (buttonDescriptor.section === 'OTHER' && buttonDescriptor.hasDropdown) {
			members.driver.getLogger().errorApp(new Error('registerToolbarButtonForThreadView does not support section=OTHER and hasDropdown=true together'));
			buttonDescriptor = {...buttonDescriptor, hasDropdown: false};
		}
		return this.registerThreadButton({
			positions: ['THREAD'],
			threadSection: buttonDescriptor.section,

			title: buttonDescriptor.title,
			iconUrl: buttonDescriptor.iconUrl,
			iconClass: buttonDescriptor.iconClass,
			onClick: event => {
				if (event.selectedThreadViews.length !== 1) throw new Error('should not happen');
				if (!buttonDescriptor.onClick) return;
				buttonDescriptor.onClick({
					dropdown: event.dropdown,
					threadView: event.selectedThreadViews[0]
				});
			},
			hasDropdown: buttonDescriptor.hasDropdown,
			hideFor: buttonDescriptor.hideFor,
			keyboardShortcutHandle: buttonDescriptor.keyboardShortcutHandle
		});
	}

	setAppToolbarButton(appToolbarButtonDescriptor: Object){
		const {driver, piOpts} = get(memberMap, this);
		driver.getLogger().deprecationWarning(
			'Toolbars.setAppToolbarButton', 'Toolbars.addToolbarButtonForApp');
		if (piOpts.REQUESTED_API_VERSION !== 1) {
			throw new Error('This method was discontinued after API version 1');
		}
		return this.addToolbarButtonForApp(appToolbarButtonDescriptor);
	}

	addToolbarButtonForApp(buttonDescriptor: Object){
		const buttonDescriptorStream = kefirCast(Kefir, buttonDescriptor);
		const appToolbarButtonViewDriverPromise = get(memberMap, this).driver.addToolbarButtonForApp(buttonDescriptorStream);
		const appToolbarButtonView = new AppToolbarButtonView(get(memberMap, this).driver, appToolbarButtonViewDriverPromise);

		return appToolbarButtonView;
	}
}
