/**
* @class
* Object that represents an Attachment Card visible in a message containing attachments.
*/
var AttachmentCardView = /** @lends AttachmentCardView */{

	// There aren't ways to get non-FILE attachment cards presently, so this
	// jsdoc comment is disabled for now.
	/*
	* Returns the type of the attachment card. Permissable values are
	* {FILE} (regular file attachments), {DRIVE} (Drive attachments that are
	*  present as links in the message), {FILE_IMAGE} (Image attachments),
	* {CUSTOM} (attachment cards added by this or other apps built on the SDK) or
	* {OTHER} (other types of attachments rendered by Gmail/Inbox such as YouTube or Yelp links).
	* @return {string}
	*/
	getAttachmentType: function(){},


	/**
	* Adds a button to this attachment card.
	* @param {DownloadButtonDescriptor|CustomButtonDescriptor} buttonDescriptor - The description of the button.
	* @return {void}
	*/
	addButton: function(){},

	// If/when we expose other types of attachment cards, re-add this sentence:
	// "For other types of attachment cards, the promise may resolve to null."
	/**
	* Get the URL for the attachment card's download link as a promise for a
	* string. For Gmail file attachments, the URL will be a short-lived URL that
	* can be accessed without cookies.
	* @return {Promise.<string>}
	*/
	getDownloadURL: function() {},

	/**
	 * Get the MessageView that this attachment card belongs to.
	 * @return {MessageView}
	 */
	getMessageView: function() {}

	/**
	 * Fires when the view card is destroyed.
	 * @event AttachmentCardView#destroy
	 */

};
