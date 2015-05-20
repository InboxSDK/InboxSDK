'use strict';

var _ = require('lodash');
var EventEmitter = require('../lib/safe-event-emitter');
var Bacon = require('baconjs');
var baconCast = require('bacon-cast');

var ComposeButtonView = require('./compose-button-view');

var memberMap = new WeakMap();

/**
* @class
* Object that represents an open compose window <b>or</b> reply widget.
* The fields can be easily read and modified, and certain elements can
* be attached to it. This includes buttons and sidebars.
*/
var ComposeView = function(composeViewImplementation, appId){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.composeViewImplementation = composeViewImplementation;
	members.appId = appId;

	var self = this;
	members.composeViewImplementation.getEventStream().onValue(function(event){
		self.emit(event.eventName, event.data);
	});

	members.composeViewImplementation.getEventStream().onEnd(function(){
		self.emit('close'); /* TODO: deprecated */
		self.emit('destroy');

		self.removeAllListeners();
	});
};



ComposeView.prototype = Object.create(EventEmitter.prototype);

_.extend(ComposeView.prototype, /** @lends ComposeView */ {

	/**
	* Inserts a button into the compose bar. This method also accepts a stream of {ComposeButtonDescriptor}s so that you can change the appearance of your button after you've added it.
	* @param {ComposeButtonDescriptor|Stream.<ComposeButtonDescriptor>} buttonDescriptor - The details of the button to add to the compose bar.
	* @return {void}
	*/
	addButton: function(buttonDescriptor){
		var members = memberMap.get(this);
		var buttonDescriptorStream = baconCast(Bacon, buttonDescriptor);

		var composeButtonObject = members.composeViewImplementation.addButton(buttonDescriptorStream, members.appId, {composeView: this});
		return new ComposeButtonView(composeButtonObject);
	},

	//NOT DOCUMENTED BECAUSE NOT TESTED YET
	addInnerSidebar: function(options){
		memberMap.get(this).composeViewImplementation.addInnerSidebar(options);
	},

	//NOT DOCUMENTED BECAUSE NOT TESTED YET
	addMessageSendModifier: function(modifier){
		memberMap.get(this).composeViewImplementation.addMessageSendModifier(modifier);
	},

	//NOT DOCUMENTED BECAUSE NOT TESTED YET
	addOuterSidebar: function(options){
		memberMap.get(this).composeViewImplementation.addOuterSidebar(options);
	},

	addStatusBar: function(options) {
		return memberMap.get(this).composeViewImplementation.addStatusBar(options);
	},

	addRecipientRow: function(options){
		return {
			destroy: memberMap.get(this).composeViewImplementation.addRecipientRow(baconCast(Bacon, options))
		};
	},

	/**
	* Closes the compose window.
	* @return {void}
	*/
	close: function(){
		memberMap.get(this).composeViewImplementation.close();
	},

	/**
	* Returns the HTMLElement of the body of the compose view.
	* @return {HTMLElement}
	*/
	getBodyElement: function(){
		return memberMap.get(this).composeViewImplementation.getBodyElement();
	},

	/* NOT DOCUMENTED BECAUSE NOT SURE IF API USERS NEED THIS */
	getComposeID: function(){
		return memberMap.get(this).composeViewImplementation.getComposeID();
	},

	/**
	* Returns the message ID of the draft. If Gmail has not assigned a message ID
	* yet, then this will be null. Note that Gmail regenerates a new message ID
	* whenever the draft is modified!
	* @return {string}
	*/
	getMessageID: function() {
		return memberMap.get(this).composeViewImplementation.getMessageID();
	},

	/**
	* Returns the thread ID of the draft. If the draft is not a reply, then this
	* will be null.
	* @return {string}
	*/
	getThreadID: function() {
		return memberMap.get(this).composeViewImplementation.getThreadID();
	},

	/**
	* Returns an html string of the contents of the body of the compose view.
	* @return {string}
	*/
	getHTMLContent: function(){
		return memberMap.get(this).composeViewImplementation.getHTMLContent();
	},

	/*
	* Returns a string of HTML containing any text and elements highlighted by the user inside the email body.
	* @return {string}
	*/
	getSelectedBodyHTML: function(){
		return memberMap.get(this).composeViewImplementation.getSelectedBodyHTML();
	},

	/**
	* Returns a plain string containing any text highlighted by the user inside the email body.
	* @return {string}
	*/
	getSelectedBodyText: function(){
		return memberMap.get(this).composeViewImplementation.getSelectedBodyText();
	},

	/**
	* Returns a plain string containing the subject of the email.
	* @return {string}
	*/
	getSubject: function(){
		return memberMap.get(this).composeViewImplementation.getSubject();
	},

	/**
	* Returns a plain text string containing all the text of the email body.
	* @return {string}
	*/
	getTextContent: function(){
		return memberMap.get(this).composeViewImplementation.getTextContent();
	},

	/**
	 * Returns an array of objects containing the name and email address of all recipients on the TO line.
	 * @return {Contact[]}
	 */
	getToRecipients: function(){
		return memberMap.get(this).composeViewImplementation.getToRecipients();
	},

	/**
	* Returns an array of objects containing the name and email address of all recipients on the CC line.
	* @return {Contact[]}
	*/
	getCcRecipients: function(){
		return memberMap.get(this).composeViewImplementation.getCcRecipients();
	},

	/**
	* Returns an array of objects containing the name and email address of all recipients on the BCC line.
	* @return {Contact[]}
	*/
	getBccRecipients: function(){
		return memberMap.get(this).composeViewImplementation.getBccRecipients();
	},

	/**
	* Places HTML inside the body of the message at the cursor or at the beginning of the message if the cursor is not in the body of the message.
	* If anything inside the body is selected, it will be replaced.
	* Returns the root HTMLElement of the inserted link.
	*
	* @param {string | HTMLElement} html - The HTML to insert. You can provide an HTML string or a DOM element.
	* @return {HTMLElement}
	*/
	insertHTMLIntoBodyAtCursor: function(html){
		return memberMap.get(this).composeViewImplementation.insertBodyHTMLAtCursor(html);
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
	* Returns the HTMLElement of the inserted chip.
	*
	* @return {HTMLElement}
	*
	*/
	insertLinkChipIntoBodyAtCursor: function(text, url, iconUrl){
		if(!iconUrl || typeof iconUrl !== 'string' || iconUrl.indexOf('http') !== 0){
			console.warn('You must provide a publicly accessible iconUrl');
			return;
		}

		return memberMap.get(this).composeViewImplementation.insertLinkChipIntoBody({
			text: text,
			url: url,
			iconUrl: iconUrl
		});
	},

	/**
	* Places a link inside the body of the message at the cursor or at the beginning of the message
	* if the cursor is not in the body of the message. If anything inside the body is selected, it will be replaced.
	* Returns the HTMLElement of the inserted link.
	*
	* @param {string} text - The anchor text of the link to insert.
	* @param {string} url - The URL of the link to insert.
	* @return {HTMLElement}
	*/
	insertLinkIntoBodyAtCursor: function(text, url){
		return memberMap.get(this).composeViewImplementation.insertLinkIntoBody(text, url);
	},


	/**
	* Places text inside the body of the message at the cursor or at the beginning of the message if the cursor is not
	* in the body of the message. If anything inside the body is selected, it will be replaced.
	* @param {string} text - The text to insert.
	* @return {void}
	*/
	insertTextIntoBodyAtCursor: function(text){
		return memberMap.get(this).composeViewImplementation.insertBodyTextAtCursor(text);
	},


	/**
	* Whether or not this compose view is an inline reply. Inline replies are used by Gmail and Inbox when responding
	* to a message right underneath the original message. You typically will not need to use this.
	* @return {boolean}
	*/
	isInlineReplyForm: function(){
		return memberMap.get(this).composeViewImplementation.isInlineReplyForm();
	},

	/**
	* Whether or not this compose view is a reply. Replies can be inline or in a seperate pop out window.
	* You typically will not need to use this.
	* @return {boolean}
	*/
	isReply: function(){
		return memberMap.get(this).composeViewImplementation.isReply();
	},

	/**
	* Sets the "To" field of the draft, replacing the existing values.
	* @param {string[]} emails - Array of email addresses to set.
	* @return {void}
	*/
	setToRecipients: function(emails){
		memberMap.get(this).composeViewImplementation.setToRecipients(emails);
	},

	/**
	* Sets the "CC" field of the draft, replacing the existing values.
	* @param {string[]} emails - Array of email addresses to set.
	* @return {void}
	*/
	setCcRecipients: function(emails){
		memberMap.get(this).composeViewImplementation.setCcRecipients(emails);
	},

	/**
	* Sets the "BCC" field of the draft, replacing the existing values.
	* @param {string[]} emails - Array of email addresses to set.
	* @return {void}
	*/
	setBccRecipients: function(emails){
		memberMap.get(this).composeViewImplementation.setBccRecipients(emails);
	},

	/**
	 * Gets the contact info of the value selection in the "From" field. Gives
	 * information about the user even if the From field isn't visible.
	 * @return {Contact}
	 */
	getFromContact: function() {
		return memberMap.get(this).composeViewImplementation.getFromContact();
	},

	/**
	 * Gets all of the options available in the "From" field.
	 * @return {Contact[]}
	 */
	getFromContactChoices: function() {
		return memberMap.get(this).composeViewImplementation.getFromContactChoices();
	},

	/**
	 * Changes the email address picked in the from field. Throws an exception if
	 * the requested choice isn't available. No error is thrown if the From field
	 * is not visible if the user's own email address is chosen.
	 * @param {string} email - Address to set the from field to use.
	* @return {void}
	 */
	setFromEmail: function(email) {
		memberMap.get(this).composeViewImplementation.setFromEmail(email);
	},

	//NOT DOCUMENTED BECAUSE STREAK-ONLY FOR NOW
	getElement: function(){
		return memberMap.get(this).composeViewImplementation.getElement();
	},

	/**
	* Fires when the compose view is closed. This can be triggered by the .close method, the user
	* clicking the close or discard buttons, the message being sent, etc.
	* @event ComposeView#destroy
	*/

	/**
	* Fires when a compose view gets a new message ID assigned. Compose views get
	* new message IDs assigned to them whenever the user edits the message.
	* @event ComposeView#messageIDChange
	*/

	/**
	* Fires when the user presses send. During this phase (between the presending and sending events)
	* you can modify the {ComposeView} before the message actually starts sending. Note that multiple
	* applications may modify the message. This event is the only one which allows you to modify or
	* cancel the sent message. This event may be emitted multiple times for one message.
	* @event ComposeView#presending
	* @param {function} cancel - a function you can call to cancel the sending of this message. This
	* will prevent the message from being sent.
	*/

	/**
	* Fires when an AJAX request to Gmail/Inbox has been initiated but the response has not yet been
	* received. Any modifications you make to the {ComposeView} at this point will not have an effect
	* as the AJAX request has already been sent. You'd typically use this event to record stats about
	* what messages are being sent.
	* @event ComposeView#sending
	*/

	/**
	* Fires when the Gmail server has confirmed receiving the message. An event
	* object containing gmailMessageId and gmailThreadId properties will be
	* passed to the event listeners.
	* @event ComposeView#sent
	* @param {string} gmailThreadId - the thread ID of the message that was just sent
	* @param {string} gmailMessageId - the message ID of the message that was just sent
	*/

	/**
	* Fires when any of the To/Cc/Bcc fields are changed.
	* @event ComposeView#recipientsChanged
	* @param {Contact[]} to.added - a list of contacts that were added to the "To" recipients
	* @param {Contact[]} to.removed - a list of contacts that were removed from the "To" recipients
	* @param {Contact[]} cc.added - a list of contacts that were added to the "CC" recipients
	* @param {Contact[]} cc.removed - a list of contacts that were removed from the "CC" recipients
	* @param {Contact[]} bcc.added - a list of contacts that were added to the "BCC" recipients
	* @param {Contact[]} bcc.removed - a list of contacts that were removed from the "BCC" recipients
	*/

	/**
	 * Fires when a to contact is added.
	 * @event ComposeView#toContactAdded
	 * @param {Contact} contact - the contact that was added to the "To" recipients
	 */

	/**
	 * Fires when a to contact is removed.
	 * @event ComposeView#toContactRemoved
	 * @param {Contact} contact - the contact that was removed from the "To" recipients
	 */

	/**
	 * Fires when a CC contact is added.
	 * @event ComposeView#ccContactAdded
	 * @param {Contact} contact - the contact that was added to the "CC" recipients
	 */

	/**
	 * Fires when a CC contact is removed.
	 * @event ComposeView#ccContactRemoved
	 * @param {Contact} contact - the contact that was removed from the "CC" recipients
	 */

	/**
	 * Fires when BCC to contact is added.
	 * @event ComposeView#bccContactAdded
	 * @param {Contact} contact - the contact that was added to the "BCC" recipients
	 */

	/**
	 * Fires when a BCC contact is removed.
	 * @event ComposeView#bccContactRemoved
	 * @param {Contact} contact - the contact that was removed from the "BCC" recipients
	 */
});

module.exports = ComposeView;





/**
* @class
* This type is passed into the {ComposeView.addButton()} method as a way to configure the button shown.
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
	* An optional class to apply to the icon.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconClass:null,

	/**
	* This is called when the button is clicked, and gets passed an event object. The event object will have a composeView
	* object and optionally a dropdown property if the button had a dropdown.
	* @type {func(event)}
	*/
	onClick:null,

	/**
	* If true, the button will open a dropdown menu above it, and the event object will have a {dropdown} property of type {DropdownView} that
	* allows the dropdown to be customized when opened.
	* ^optional
	* ^default=false
	* @type {boolean}
	*/
	hasDropdown:null,

	/**
	* There are currently two supported types of compose buttons, one which results in the message being sent and
	* another which just modifies the current message but does not send it. The button is placed according to its
	* type. The permissable values for type are {SEND_ACTION} and {MODIFIER}.
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
	orderHint:null,

	/**
	* If false, the button will be disabled and will not emit any events.
	* ^optional
	* ^default=true
	* @type {boolean}
	*/
	enabled: null
};


/**
 * @class  Contact
 * Simple object that contains the email address and full name if it exists.
 */
var Contact = /** @lends Contact */ {

	/**
	 * The email address of the contact.
	 * @type {string}
	 */
	emailAddress: null,

	/**
	 * The name of the contact, may be null.
	 * @type {string}
	 */
	name: null
};
