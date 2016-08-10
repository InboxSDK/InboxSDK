/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import util from 'util';
import EventEmitter from '../../lib/safe-event-emitter';
import type Membrane from '../../lib/Membrane';

import type MessageView from './message-view';
import type {AttachmentCardViewDriver} from '../../driver-interfaces/driver';

// documented in src/docs/
class AttachmentCardView extends EventEmitter {
	_attachmentCardImplementation: AttachmentCardViewDriver;
	_membrane: Membrane;
	destroyed: boolean;

	constructor(attachmentCardImplementation: AttachmentCardViewDriver, membrane: Membrane) {
		super();
		this.destroyed = false;
		this._membrane = membrane;
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
		const messageViewDriver = this._attachmentCardImplementation.getMessageViewDriver();
		return messageViewDriver ? this._membrane.get(messageViewDriver) : null;
	}
}

export default defn(module, AttachmentCardView);
