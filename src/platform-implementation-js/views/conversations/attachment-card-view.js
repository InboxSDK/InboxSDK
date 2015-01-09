var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

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
	* returns the type of the attachment card. Permissable values are
	* <code>FILE</code> (regular file attachments), <code>DRIVE</code> (Drive attachments that are
	*  present as links in the message), <code>FILE_IMAGE</code> (Image attachments),
	* <code>CUSTOM</code> (attachment cards added by this or other apps built on the SDK) or
	* <code>OTHER</code> (other types of attachments rendered by Gmail/Inbox such as YouTube or Yelp links)
	* @return {string}
	*/
	getAttachmentType: function(){
		return this._attachmentCardImplementation.getAttachmentType();
	},


	/**
	* adds a button to this attachment card
	* @param {DownloadButtonDescriptor|CustomButtonDescriptor}
	* @return {void}
	*/
	addButton: function(buttonOptions){
		this._attachmentCardImplementation.addButton(buttonOptions);
	}


	/**
	 * Fires when the view card is destroyed
	 * @event AttachmentCardView#destroy
	 */

});

module.exports = AttachmentCardView;
