var _ = require('lodash');
var EventEmitter = require('../../lib/safe-event-emitter');

/**
* @class
* Object that represents an Attachment Card visible in a message containing attachments.
*/
var AttachmentCardView = function(attachmentCardImplementation){
	EventEmitter.call(this);

	this._attachmentCardImplementation = attachmentCardImplementation;
	this._attachmentCardImplementation.getEventStream().onEnd(this, 'emit', 'destroy');
};

AttachmentCardView.prototype = Object.create(EventEmitter.prototype);

_.extend(AttachmentCardView.prototype, /** @lends AttachmentCardView */{

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
	}


	/**
	 * Fires when the view card is destroyed.
	 * @event AttachmentCardView#destroy
	 */

});

module.exports = AttachmentCardView;
