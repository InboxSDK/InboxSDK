var _ = require('lodash');
var util = require('util');
var EventEmitter = require('../../lib/safe-event-emitter');

/**
* @class
* Object that represents an Attachment Card visible in a message containing attachments.
*/
function AttachmentCardView(attachmentCardImplementation) {
	EventEmitter.call(this);

	this._attachmentCardImplementation = attachmentCardImplementation;
	this._attachmentCardImplementation.getEventStream().onEnd(this, 'emit', 'destroy');
}

util.inherits(AttachmentCardView, EventEmitter);

_.assign(AttachmentCardView.prototype, /** @lends AttachmentCardView */{

	/**
	* Returns the type of the attachment card. Permissable values are
	* {FILE} (regular file attachments), {DRIVE} (Drive attachments that are
	*  present as links in the message), {FILE_IMAGE} (Image attachments),
	* {CUSTOM} (attachment cards added by this or other apps built on the SDK) or
	* {OTHER} (other types of attachments rendered by Gmail/Inbox such as YouTube or Yelp links).
	* @return {string}
	*/
	getAttachmentType: function(){
		return this._attachmentCardImplementation.getAttachmentType();
	},


	/**
	* Adds a button to this attachment card.
	* @param {DownloadButtonDescriptor|CustomButtonDescriptor} buttonDescriptor - The description of the button.
	* @return {void}
	*/
	addButton: function(buttonOptions){
		this._attachmentCardImplementation.addButton(buttonOptions);
	},

	/**
	* Get the URL for the attachment card's download link as a promise for a
	* string. For Gmail file attachments, the URL will be a short-lived URL that
	* can be accessed without cookies. For other types of attachment cards, the
	* promise may resolve to null.
	* @return {Promise(string)}
	*/
	getDownloadURL: function() {
		return this._attachmentCardImplementation.getDownloadURL();
	}

	/**
	 * Fires when the view card is destroyed.
	 * @event AttachmentCardView#destroy
	 */

});

module.exports = AttachmentCardView;
