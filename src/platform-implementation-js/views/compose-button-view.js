/* @flow */
//jshint ignore:start

var _ = require('lodash');
import EventEmitter from '../lib/safe-event-emitter';
import type {ComposeViewDriver} from '../driver-interfaces/compose-view-driver';

export type TooltipDescriptor = {
	el?: ?HTMLElement,
	title?: ?string,
	subtitle?: ?string,
	imageUrl?: ?string,
	button?: ?{onClick?: Function, title: string}&Object
};

export default class ComposeButtonView extends EventEmitter {
	constructor(optionsPromise: Promise<?Object>, composeViewDriver: ComposeViewDriver) {
		super();
		var members = {optionsPromise, composeViewDriver};
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
		var members = memberMap.get(this);
		members.optionsPromise.then(options => {
			if (!options) return;
			members.composeViewDriver.addTooltipToButton(options.buttonViewController, options.buttonDescriptor, tooltipDescriptor);
		});
	}

	closeTooltip() {
		var members = memberMap.get(this);
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
	composeButtonViewInstance.emit('destroy');
}
