/* @flow */

var _ = require('lodash');

export type Options = {
	activateFunction?: ?()=>void;
	onClick?: ?()=>void;
	buttonView: Object;
};

export default class BasicButtonViewController {
	_activateFunction: ?()=>void;
	_view: Object;

	constructor(options: Options) {
		this._activateFunction = options.activateFunction || options.onClick;
		this._view = options.buttonView;

		this._view
			.getEventStream()
			.filter(event => event.eventName === 'click')
			.onValue(e => {
				this.activate(e);
			});
	}

	destroy() {
		this._activateFunction = null;
		this._view.destroy();
	}

	getView(): Object {
		return this._view;
	}

	setActivateFunction(f: ()=>void) {
		this._activateFunction = f;
	}

	activate(){
		if(this._activateFunction){
			this._activateFunction();
		}
	}
}
