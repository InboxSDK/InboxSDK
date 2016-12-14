/* @flow */

import _ from 'lodash';
import EventEmitter from '../lib/safe-event-emitter';
import get from '../../common/get-or-fail';
import type {ComposeViewDriver} from '../driver-interfaces/compose-view-driver';

export type TooltipDescriptor = {
	el?: ?HTMLElement,
	title?: ?string,
	subtitle?: ?string,
	imageUrl?: ?string,
	button?: ?{onClick?: Function, title: string}&Object
};

export default class ComposeButtonView extends EventEmitter {
	destroyed: boolean;

	constructor(optionsPromise: Promise<?Object>, composeViewDriver: ComposeViewDriver) {
		super();
		this.destroyed = false;
		const members = {optionsPromise, composeViewDriver};
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

type Options = {
	buttonDescriptor: Object,
	buttonViewController: Object
};
var memberMap: WeakMap<ComposeButtonView, {
	composeViewDriver: ComposeViewDriver,
	optionsPromise: Promise<?Options>
}> = new WeakMap();

function _destroy(composeButtonViewInstance: ComposeButtonView) {
	composeButtonViewInstance.destroyed = true;
	composeButtonViewInstance.emit('destroy');
}
