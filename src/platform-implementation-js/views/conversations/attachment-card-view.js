/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import util from 'util';
import RSVP from 'rsvp';
import EventEmitter from '../../lib/safe-event-emitter';

import type MessageView from './message-view';
import type GmailAttachmentCardView from '../../dom-driver/gmail/views/gmail-attachment-card-view'

// documented in src/docs/
class AttachmentCardView extends EventEmitter {
	_messageView: MessageView;
	_attachmentCardImplementation: GmailAttachmentCardView;
	destroyed: boolean;

	constructor(attachmentCardImplementation: GmailAttachmentCardView, messageView: MessageView) {
		super();
		this.destroyed = false;
		this._messageView = messageView;
		this._attachmentCardImplementation = attachmentCardImplementation;
		this._attachmentCardImplementation.getEventStream().onEnd(() => {
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

	getMessageView(): MessageView {
		return this._messageView;
	}
}

export default defn(module, AttachmentCardView);
