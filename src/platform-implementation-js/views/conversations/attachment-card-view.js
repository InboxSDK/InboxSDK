/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import util from 'util';
import EventEmitter from '../../lib/safe-event-emitter';

import type MessageView from './message-view';
import type {AttachmentCardViewDriver} from '../../driver-interfaces/driver';

// documented in src/docs/
class AttachmentCardView extends EventEmitter {
	_messageView: ?MessageView;
	_attachmentCardImplementation: AttachmentCardViewDriver;
	destroyed: boolean;

	constructor(attachmentCardImplementation: AttachmentCardViewDriver, messageView: ?MessageView) {
		super();
		this.destroyed = false;
		this._messageView = messageView;
		this._attachmentCardImplementation = attachmentCardImplementation;
		this._attachmentCardImplementation.getStopper().onValue(() => {
			this.destroyed = true;
			this.emit('destroy');
		});
	}

	getAttachmentType(): string {
		return this._attachmentCardImplementation.getAttachmentType();
	}

	addButton(buttonOptions: Object) {
		this._attachmentCardImplementation.addButton(buttonOptions);
	}

	getTitle(): string {
		return this._attachmentCardImplementation.getTitle();
	}

	getDownloadURL(): Promise<?string> {
		return this._attachmentCardImplementation.getDownloadURL();
	}

	getMessageView(): ?MessageView {
		return this._messageView;
	}
}

export default defn(module, AttachmentCardView);
