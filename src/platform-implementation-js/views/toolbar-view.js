/* @flow */
//jshint ignore:start

/*
 *
 * This class only serves for internal bookkeeping purposes and isn't exposed to the apps right now
 *
 */

import EventEmitter from '../lib/safe-event-emitter';

export default class ToolbarView extends EventEmitter {
	_toolbarViewDriver: ?Object;

	constructor(toolbarViewDriver: Object) {
		super();
		this._toolbarViewDriver = toolbarViewDriver;

		toolbarViewDriver.getStopper().onValue(() => {
			this.emit('destroy');
			this._toolbarViewDriver = null;
		});
	}

	// Remove this method if this class ever becomes public.
	getToolbarViewDriver(): Object {
		if (!this._toolbarViewDriver) {
			throw new Error("ToolbarView was already destroyed");
		}
		return this._toolbarViewDriver;
	}
}
