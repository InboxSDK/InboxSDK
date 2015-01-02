var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Bacon = require('baconjs');
var baconCast = require('bacon-cast');

/**
* @class
* Object that represents an open compose window <b>or</b> reply widget.
* The fields can be easily read and modified, and certain elements can
* be attached to it. This includes buttons and sidebars.
*/
var ComposeView = function(composeViewImplementation, appId){
	EventEmitter.call(this);

	this._composeViewImplementation = composeViewImplementation;
	this._appId = appId;

	var self = this;
	this._composeViewImplementation.getEventStream().onValue(function(event){
		self.emit(event.eventName, event.data);
	});

	this._composeViewImplementation.getEventStream().onEnd(function(){
		self.emit('close'); /* TODO: deprecated */
		self.emit('unload');
	});
};



ComposeView.prototype = Object.create(EventEmitter.prototype);

_.extend(ComposeView.prototype, /** @lends ComposeView */ {

	/**
	* Inserts a button into the compose bar.
	* @param {ComposeButtonDescriptor} buttonDescriptor - The details of the button to add to the compose bar.
	* @return {void}
	*/
	addButton: function(buttonDescriptor){
		var buttonDescriptorStream = baconCast(Bacon, buttonDescriptor);
		this._composeViewImplementation.addButton(buttonDescriptorStream, this._appId, {composeView: this});
	},

	//NOT DOCUMENTED BECAUSE NOT TESTED YET
	addInnerSidebar: function(options){
		this._composeViewImplementation.addInnerSidebar(options);
	},

	//NOT DOCUMENTED BECAUSE NOT TESTED YET
	addMessageSendModifier: function(modifier){
		this._composeViewImplementation.addMessageSendModifier(modifier);
	},

	//NOT DOCUMENTED BECAUSE NOT TESTED YET
	addOuterSidebar: function(options){
		this._composeViewImplementation.addOuterSidebar(options);
	},

	/**
	* closes the compose window
	*/
	close: function(){
		this._composeViewImplementation.close();
	},

	/**
	* Returns the HTMLElement of the body of the compose view
	* @return {HTMLElement}
	*/
	getBodyElement: function(){
		return this._composeViewImplementation.getBodyElement();
	},

	getComposeID: function(){
		return this._composeViewImplementation.getComposeID();
	},

	/**
	* Returns an html string of the contents of the body of the compose view
	* @return {string}
	*/
	getHTMLContent: function(){
		return this._composeViewImplementation.getHTMLContent();
	},

	/*
	* Returns a string of HTML containing any text and elements highlighted by the user inside the email body.
	* @return {string}
	*/
	getSelectedBodyHTML: function(){
		return this._composeViewImplementation.getSelectedBodyHTML();
	},

	/**
	* Returns a plain string containing any text highlighted by the user inside the email body.
	* @return {string}
	*/
	getSelectedBodyText: function(){
		return this._composeViewImplementation.getSelectedBodyText();
	},

	/**
	* Returns a plain string containing the subject of the email
	* @return {string}
	*/
	getSubject: function(){
		return this._composeViewImplementation.getSubject();
	},

	/**
	* Returns a plain text string containing all the text of the email body
	* @return {string}
	*/
	getTextContent: function(){
		return this._composeViewImplementation.getTextContent();
	},

	/**
	 * Returns an array of objects containing the name and email address of all recipients on the TO line
	 * @return {object[]}
	 */
	getToRecipients: function(){
		return this._composeViewImplementation.getToRecipients();
	},

	/**
	* Returns an array of objects containing the name and email address of all recipients on the CC line
	* @return {object[]}
	*/
	getCcRecipients: function(){
		return this._composeViewImplementation.getCcRecipients();
	},

	/**
	* Returns an array of objects containing the name and email address of all recipients on the BCC line
	* @return {object[]}
	*/
	getBccRecipients: function(){
		return this._composeViewImplementation.getBccRecipients();
	},

	/**
	* Places HTML inside the body of the message at the cursor or at the beginning of the message if the cursor is not in the body of the message.
	* If anything inside the body is selected, it will be replaced.
	* @param {string | HTMLElement} html - The HTML to insert. You can provide an HTML string or a DOM element  (HTMLElement)
	* @return {void}
	*/
	insertHTMLIntoBodyAtCursor: function(html){
		return this._composeViewImplementation.insertBodyHTMLAtCursor(html);
	},

	/**
	* Places a link chip inside the body of the message at the cursor or at the beginning of the message if
	* the cursor is not in the body of the message. If anything inside the body is selected, it will be replaced.
	* A link chip is an enhanced link with an icon and a callout. These are typically used by Gmail when inserting
	* a Google Drive link.
	*
	* @param {string} text - The anchor text of the link to insert.
	* @param {string} url - The URL of the link to insert.
	* @param {string} iconUrl - The URL of the icon that will be shown in the chip.
	*
	* @return {void}
	*
	*/
	insertLinkChipIntoBodyAtCursor: function(text, url, iconUrl){
		if(!iconUrl || typeof iconUrl !== 'string' || iconUrl.indexOf('http') !== 0){
			console.warn('You must provide a publicly accessible iconUrl');
			return;
		}

		return this._composeViewImplementation.insertLinkChipIntoBody({
			text: text,
			url: url,
			iconUrl: iconUrl
		});
	},

	/**
	* Places a link inside the body of the message at the cursor or at the beginning of the message
	* if the cursor is not in the body of the message. If anything inside the body is selected, it will be replaced.
	*
	* @param {string} text - The anchor text of the link to insert.
	* @param {string} url - The URL of the link to insert.
	* @return {void}
	*/
	insertLinkIntoBodyAtCursor: function(text, url){
		return this._composeViewImplementation.insertLinkIntoBody(text, url);
	},


	/**
	* Places text inside the body of the message at the cursor or at the beginning of the message if the cursor is not
	* in the body of the message. If anything inside the body is selected, it will be replaced.
	* @param {string} text - the text to insert
	* @return {void}
	*/
	insertTextIntoBodyAtCursor: function(text){
		return this._composeViewImplementation.insertBodyTextAtCursor(text);
	},


	/**
	* whether or not this compose view is an inline reply. Inline replies are used by Gmail and Inbox when responding
	* to a message right underneath the original message. You typically will not need to use this.
	* @return {boolean}
	*/
	isInlineReplyForm: function(){
		return this._composeViewImplementation.isInlineReplyForm();
	},

	/**
	* whether or not this compose view is a reply. Replies can be inline or in a seperate pop out window.
	* You typically will not need to use this.
	* @return {boolean}
	*/
	isReply: function(){
		return this._composeViewImplementation.isReply();
	},

	//NOT DOCUMENTED BECAUSE NOT TESTED YET
	setBccRecipients: function(emails){
		this._composeViewImplementation.setBccRecipients(emails);
	},

	//NOT DOCUMENTED BECAUSE NOT TESTED YET
	setCcRecipients: function(emails){
		this._composeViewImplementation.setCcRecipients(emails);
	},

	//NOT DOCUMENTED BECAUSE NOT TESTED YET
	setToRecipients: function(emails){
		this._composeViewImplementation.setToRecipients(emails);
	}

	/**
	* Fires when the compose view is closed. This can be triggered by the .close method, the user
	* clicking the close or discard buttons, the message being sent, etc.
	* @event ComposeView#unload
	*/

	/**
	* Fires when the user presses send.
	* @event ComposeView#sending
	*/

	/**
	* Fires when the Gmail server has confirmed receiving the message. An event
	* object containing gmailMessageId and gmailThreadId properties will be
	* passed to the event listeners.
	* @event ComposeView#sent
	*/

	/**
	* Fires when any of the To/Cc/Bcc fields are changed. The passed in callback will receive an object which splits out
	* what happened. {to: {added: [{Contact}], removed: [{Contact}]}, cc: {added: [{Contact}], removed: [{Contact}]}, bcc: {added: [{Contact}], removed: [{Contact}]}}
	* @event ComposeView#recipientsChanged
	*/

	/**
	 * Fires when a to contact is added
	 * @event ComposeView#toContactAdded
	 */

	/**
	 * Fires when a to contact is removed
	 * @event ComposeView#toContactRemoved
	 */

	/**
	 * Fires when a CC contact is added
	 * @event ComposeView#ccContactAdded
	 */

	/**
	 * Fires when a CC contact is removed
	 * @event ComposeView#ccContactRemoved
	 */

	/**
	 * Fires when BCC to contact is added
	 * @event ComposeView#bccContactAdded
	 */

	/**
	 * Fires when a BCC contact is removed
	 * @event ComposeView#bccContactRemoved
	 */
});

module.exports = ComposeView;





/**
* @class
* This type is passed into the <code>ComposeView.addButton</code> method as a way to configure the button shown.
*/
var ComposeButtonDescriptor = /** @lends ComposeButtonDescriptor */{

/**
* Text to show when the user hovers the mouse over the button.
* @type {string}
*/
title:null,

/**
* URL for the icon to show on the button. Should be a local extension file URL or a HTTPS URL.
* @type {string}
*/
iconUrl:null,

/**
* This is called when the button is clicked, and gets passed an event object. The event object will have a composeView
* object and optionally a dropdown property if the button had a dropdown.
* @type {function(event)}
*/
onClick:null,

/**
* If true, the button will open a dropdown menu above it, and the event object will have a dropdown property that
* allows the dropdown to be customized when opened.
* ^optional
* ^default=false
* @type {boolean}
*/
hasDropdown:null,

/**
* There are currently two supported types of compose buttons, one which results in the message being sent and
* another which just modifies the current message but does not send it. The button is placed according to its
* type. The permissable values for type are <code>SEND_ACTION</code> and <code>MODIFIER</code>
* ^optional
* ^default=MODIFIER
* @type {string}
*/
type:null,

/**
* If multiple buttons are placed next to each other, then they will be ordered by this value.
* ^optional
* ^default=0
* @type {number}
*/
orderHint:null
};


/**
 * @class  Contact
 * Simple object that contains the email address and full name if it exists
 */
var Contact = /** @lends Contact */ {

/**
 * email address of the contact
 * @type {string}
 */
emailAddress: null,

/**
 * name of the contact, may be null
 * @type {string}
 */
name: null

};
