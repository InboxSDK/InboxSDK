/* @flow */

import type Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

export type Options = {
	activateFunction?: ?()=>void;
	onClick?: ?()=>void;
	buttonView: Object;
};

export default class BasicButtonViewController {
	_activateFunction: ?(event: Object)=>void;
	_view: Object;
	_stopper = kefirStopper();

	constructor(options: Options) {
		this._activateFunction = options.activateFunction || options.onClick;
		this._view = options.buttonView;

		this._view
			.getEventStream()
			.filter(event => event.eventName === 'click')
			.onValue(() => {
				this.activate();
			});
	}

	getStopper(): Kefir.Observable<null> {
		return this._stopper;
	}

	destroy() {
		this._activateFunction = null;
		this._view.destroy();
		this._stopper.destroy();
	}

	update(options: ?Object) {
		this.getView().update(options);
		this.setActivateFunction(options && (options.activateFunction || options.onClick));
	}

	getView(): Object {
		return this._view;
	}

	setActivateFunction(f: ?(event: Object)=>void) {
		this._activateFunction = f;
	}

	activate(){
		if(this._activateFunction){
			this._activateFunction({});
		}
	}
}
