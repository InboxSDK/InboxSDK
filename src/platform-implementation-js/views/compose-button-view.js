/* @flow */
//jshint ignore:start

var _ = require('lodash');
var asap = require('asap');
import EventEmitter from '../lib/safe-event-emitter';

export type TooltipDescriptor = {
	el?: HTMLElement,
	title?: string,
	subtitle?: string,
	imageUrl?: string,
	button?: {onClick?: Function}&Object
};

export default class ComposeButtonView extends EventEmitter {
	constructor(optionsPromise: Promise<?Object>) {
		super();
		var members: Object = {optionsPromise};
		memberMap.set(this, members);

		members.optionsPromise.then(options => {
			if(!options) {
				_destroy(this);
				return;
			}

			members.buttonViewController = options.buttonViewController;
			members.buttonDescriptor = options.buttonDescriptor;
			members.composeViewDriver = options.composeViewDriver;

			members.composeViewDriver.getStopper().onValue(() => {
				_destroy(this);
			});
		});
	}

	showTooltip(tooltipDescriptor: TooltipDescriptor) {
		var members = memberMap.get(this);
		members.optionsPromise.then(function(){
			asap(() => {
				members.composeViewDriver.addTooltipToButton(members.buttonViewController, members.buttonDescriptor, tooltipDescriptor);
			});
		});
	}

	closeTooltip() {
		var members = memberMap.get(this);
		members.optionsPromise.then(function(){
			asap(() => {
				members.composeViewDriver.closeButtonTooltip(members.buttonViewController);
			});
		});
	}
}

var memberMap: WeakMap<ComposeButtonView, Object> = new WeakMap();

function _destroy(composeButtonViewInstance: ComposeButtonView) {
	composeButtonViewInstance.emit('destroy');
}
