/**
* @class
* Object that represents an Attachment Card visible in a message containing attachments.
*/
var AttachmentCardView = /** @lends AttachmentCardView */{

	/**
	* Returns the type of the attachment card. Values returned include
	* {FILE} (regular file attachments), {DRIVE} (Drive attachments that are
	*  present as links in the message), {CUSTOM} (attachment cards added by this
	* or other apps built on the SDK), and {UNKNOWN} (for other types of
	* attachment cards rendered by Gmail/Inbox that aren't specifically supported
	* currently such as YouTube and Yelp links).
	* @return {string}
	*/
	getAttachmentType: function(){},


	/**
	* Adds a button to this attachment card.
	* @param {CustomButtonDescriptor} buttonDescriptor - The description of the button.
	* @return {void}
	*/
	addButton: function(){},

	/**
	* Reads the title on the attachment card. Typically this will be a filename.
	* @return {string}
	*/
	getTitle: function() {},

	/**
	* This method is deprecated. Please use the same-named method on the
	* {AttachmentCardClickEvent} object instead.
	* @return {Promise.<string>}
	*/
	getDownloadURL: function() {},

	/**
	 * Get the MessageView that this attachment card belongs to if it belongs to
	 * one. AttachmentCardViews in Gmail always belong to a MessageView.
	 * @return {null|MessageView}
	 */
	getMessageView: function() {},

	/**
	 * This property is set to true once the view is destroyed.
	 * @type {boolean}
	 */
	destroyed: false,

	/**
	 * Fires when the view card is destroyed.
	 * @event AttachmentCardView#destroy
	 */

};
