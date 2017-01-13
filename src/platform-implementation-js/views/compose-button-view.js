/* @flow */

import EventEmitter from '../lib/safe-event-emitter';
import get from '../../common/get-or-fail';
import type {ComposeViewDriver} from '../driver-interfaces/compose-view-driver';
import type {Driver} from '../driver-interfaces/driver';

export type TooltipDescriptor = {
	el?: ?HTMLElement,
	title?: ?string,
	subtitle?: ?string,
	imageUrl?: ?string,
	button?: ?{onClick?: Function, title: string}&Object
};

type Options = {
	buttonDescriptor: Object,
	buttonViewController: Object
};
const memberMap = new WeakMap();

export default class ComposeButtonView extends EventEmitter {
	destroyed: boolean;

	constructor(optionsPromise: Promise<?Options>, composeViewDriver: ComposeViewDriver, driver: Driver) {
		super();
		this.destroyed = false;
		const members = {optionsPromise, composeViewDriver, driver};
		memberMap.set(this, members);

		members.optionsPromise.then(options => {
			if(!options) {
				_destroy(this);
				return;
			}

			members.composeViewDriver.getStopper().onValue(() => {
				_destroy(this);
			});
		});
	}

	showTooltip(tooltipDescriptor: TooltipDescriptor) {
		const members = get(memberMap, this);
		members.driver.getLogger().eventSdkPassive('ComposeButtonView.showTooltip', {
			keys: Object.keys(tooltipDescriptor)
		});
		members.optionsPromise.then(options => {
			if (!options) return;
			members.composeViewDriver.addTooltipToButton(options.buttonViewController, options.buttonDescriptor, tooltipDescriptor);
		});
	}

	closeTooltip() {
		const members = get(memberMap, this);
		members.optionsPromise.then(options => {
			if (!options) return;
			members.composeViewDriver.closeButtonTooltip(options.buttonViewController);
		});
	}
}

function _destroy(composeButtonViewInstance: ComposeButtonView) {
	composeButtonViewInstance.destroyed = true;
	composeButtonViewInstance.emit('destroy');
}
