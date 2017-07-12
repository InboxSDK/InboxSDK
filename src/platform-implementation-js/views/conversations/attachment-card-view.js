/* @flow */

import {defn} from 'ud';
import util from 'util';
import EventEmitter from '../../lib/safe-event-emitter';
import type Membrane from '../../lib/Membrane';

import type MessageView from './message-view';
import type {Driver, AttachmentCardViewDriver} from '../../driver-interfaces/driver';

// documented in src/docs/
class AttachmentCardView extends EventEmitter {
	_attachmentCardImplementation: AttachmentCardViewDriver;
	_driver: Driver;
	_membrane: Membrane;
	destroyed: boolean;

	constructor(attachmentCardImplementation: AttachmentCardViewDriver, driver: Driver, membrane: Membrane) {
		super();
		this.destroyed = false;
		this._driver = driver;
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
		this._driver.getLogger().deprecationWarning('AttachmentCardView.getDownloadURL', 'AttachmentCardView.addButton -> onClick -> AttachmentCardClickEvent');
		if (this._driver.getOpts().REQUESTED_API_VERSION !== 1) {
			throw new Error('This method was discontinued after API version 1');
		}
		return this._attachmentCardImplementation.getDownloadURL();
	}

	getMessageView(): ?MessageView {
		const messageViewDriver = this._attachmentCardImplementation.getMessageViewDriver();
		return messageViewDriver ? this._membrane.get(messageViewDriver) : null;
	}
}

export default defn(module, AttachmentCardView);
