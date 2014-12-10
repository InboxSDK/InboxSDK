var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;


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
		if (_.contains(['sending','sent','close'], event.type)) {
			self.emit(event.type, event.data);
		}
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
		if(!buttonDescriptor.onValue && !buttonDescriptor.onClick){
			throw new Error('Must have an onClick function defined');
		}

		if(buttonDescriptor.hasDropdown){
			var oldOnClick = buttonDescriptor.onClick;
			buttonDescriptor.onClick = function(event){
				oldOnClick(_.extend({composeView: this}, event));
			};
		}

		this._composeViewImplementation.addButton(buttonDescriptor, this._appId);
	},

	addInnerSidebar: function(options){
		this._composeViewImplementation.addInnerSidebar(options);
	},

	addMessageSendModifier: function(modifier){
		this._composeViewImplementation.addMessageSendModifier(modifier);
	},

	addOuterSidebar: function(options){
		this._composeViewImplementation.addOuterSidebar(options);
	},

	/*
	* closes the compose window
	*/
	close: function(){
		this._composeViewImplementation.close();
	},

	getBccRecipients: function(){
		return this._composeViewImplementation.getBccRecipients();
	},

	getBodyElement: function(){
		return this._composeViewImplementation.getBodyElement();
	},

	getCcRecipients: function(){
		return this._composeViewImplementation.getCcRecipients();
	},

	getComposeID: function(){
		return this._composeViewImplementation.getComposeID();
	},

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

	getSubject: function(){
		return this._composeViewImplementation.getSubject();
	},

	getTextContent: function(){
		return this._composeViewImplementation.getTextContent();
	},

	getToRecipients: function(){
		return this._composeViewImplementation.getToRecipients();
	},

	/**
	* Places HTML inside the body of the message at the cursor or at the beginning of the message if the cursor is not in the body of the message.
	* If anything inside the body is selected, it will be replaced.
	* @param {string | HTMLElement} html - The HTML to insert. You can provide an HTML string or a DOM element  (HTMLElement)
	* @return {void}
	*/
	insertHTMLIntoBodyAtCursor: function(html){
		this._composeViewImplementation.insertBodyHTMLAtCursor(html);
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

		this._composeViewImplementation.insertLinkChipIntoBody({
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
		this._composeViewImplementation.insertLinkIntoBody(text, url);
	},


	/**
	* Places text inside the body of the message at the cursor or at the beginning of the message if the cursor is not in the body of the message. If anything inside the body is selected, it will be replaced.
	* @param {string} text - the text to insert
	* @return {void}
	*/
	insertTextIntoBodyAtCursor: function(text){
		this._composeViewImplementation.insertBodyTextAtCursor(text);
	},


	/*
	* returns true/false if current compose view is an inline reply form
	*/
	isInlineReplyForm: function(){
		return this._composeViewImplementation.isInlineReplyForm();
	},

	/*
	* returns true/false if the current compose view is for a reply. This includes "popped-out" replies
	*/
	isReply: function(){
		return this._composeViewImplementation.isReply();
	},

	setBccRecipients: function(emails){
		this._composeViewImplementation.setBccRecipients(emails);
	},

	setCcRecipients: function(emails){
		this._composeViewImplementation.setCcRecipients(emails);
	},

	setToRecipients: function(emails){
		this._composeViewImplementation.setToRecipients(emails);
	}

	/**
	* Fires when the compose view is closed. This can be triggered by the .close method, the user
	* clicking the close or discard buttons, the message being sent, etc.
	* @event ComposeView#closed
	*/

	/**
	* Fires when the user presses send.
	* @event ComposeView#sending
	*/

	/**
	* Fires when the Gmail server has confirmed receiving the message. An event object
	* containing the new threadId will be passed to the event listeners.
	* @event ComposeView#sent
	*/

	/**
	* Fires when any of the To/Cc/Bcc fields are changed.
	* @event ComposeView#recipientsChanged
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
