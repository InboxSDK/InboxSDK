/* @flow */

/*
 *
 * This class only serves for internal bookkeeping purposes and isn't exposed to the apps right now
 *
 */

import EventEmitter from '../lib/safe-event-emitter';
import type InboxListToolbarView from '../dom-driver/inbox/views/InboxListToolbarView';
import type GmailToolbarView from '../dom-driver/gmail/views/gmail-toolbar-view';

export default class ToolbarView extends EventEmitter {
	destroyed: boolean;
	_toolbarViewDriver: InboxListToolbarView|GmailToolbarView;

	constructor(toolbarViewDriver: InboxListToolbarView|GmailToolbarView) {
		super();
		this.destroyed = false;
		this._toolbarViewDriver = toolbarViewDriver;

		toolbarViewDriver.getStopper().onValue(() => {
			this.destroyed = true;
			this.emit('destroy');
		});
	}

	// Move this method somewhere private if this class ever becomes public.
	getToolbarViewDriver(): InboxListToolbarView|GmailToolbarView {
		return this._toolbarViewDriver;
	}
}
