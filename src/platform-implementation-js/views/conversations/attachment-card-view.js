import _ from 'lodash';
import util from 'util';
import RSVP from 'rsvp';
import EventEmitter from '../../lib/safe-event-emitter';

// documented in src/docs/
function AttachmentCardView(attachmentCardImplementation, messageView) {
	EventEmitter.call(this);

	this._messageView = messageView;
	this._attachmentCardImplementation = attachmentCardImplementation;
	this._attachmentCardImplementation.getEventStream().onEnd(this, 'emit', 'destroy');
}

util.inherits(AttachmentCardView, EventEmitter);

_.assign(AttachmentCardView.prototype, {

	getAttachmentType(){
		return this._attachmentCardImplementation.getAttachmentType();
	},

	addButton(buttonOptions){
		this._attachmentCardImplementation.addButton(buttonOptions);
	},

	getDownloadURL() {
		return this._attachmentCardImplementation.getDownloadURL();
	},

	getMessageView() {
		return this._messageView;
	}

});

module.exports = AttachmentCardView;
