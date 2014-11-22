var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;


var ComposeView = function(composeViewImplementation, appId){
	EventEmitter.call(this);

	this._composeViewImplementation = composeViewImplementation;
	this._appId = appId;

	var self = this;
	this._composeViewImplementation.getEventStream().onValue(function(event){
	});

	this._composeViewImplementation.getEventStream().onEnd(this, 'emit', 'close');
};

ComposeView.prototype = Object.create(EventEmitter.prototype);

_.extend(ComposeView.prototype, {

	/*
	 * adds button to the compose
	 */
	addButton: function(buttonDescriptor){
		this._composeViewImplementation.addButton(buttonDescriptor, this._appId);
	},

	/*
	* Places text inside the body of the message at the cursor or at the beginning of the message if the cursor is not in the body of the message. If anything inside the body is selected, it will be replaced.
	*/
	insertTextIntoBodyAtCursor: function(text){
		this._composeViewImplementation.insertBodyTextAtCursor(text);
	},

	/*
	* Places html inside the body of the message at the cursor or at the beginning of the message if the cursor is not in the body of the message. If anything inside the body is selected, it will be replaced.
	*/
	insertHTMLIntoBodyAtCursor: function(html){
		this._composeViewImplementation.insertBodyHTMLAtCursor(html);
	},

	/*
	* inserts link into body
	*/
	insertLinkIntoBodyAtCursor: function(text, href){
		this._composeViewImplementation.insertLinkIntoBody(text, href);
	},

	/*
	*
	* inserts a drive-like "chip"
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


	/*
	 * returns true/false if the current compose view is for a reply. This includes "popped-out" replies
	 */
	isReply: function(){
		return this._composeViewImplementation.isReply();
	},


	/*
	 * returns true/false if current compose view is an inline reply form
	 */
	isInlineReplyForm: function(){
		return this._composeViewImplementation.isInlineReplyForm();
	},

	/*
	 * closes the compose window
	 */
	close: function(){
		this._composeViewImplementation.close();
	},

	/*
	 * Returns a string containing any text and elements highlighted by the user inside the email body.
	 */
	getSelectedBodyHTML: function(){
		return this._composeViewImplementation.getSelectedBodyHTML();
	},

	/*
	 * Returns a string containing any text highlighted by the user inside the email body.
	 */
	getSelectedBodyText: function(){
		return this._composeViewImplementation.getSelectedBodyText();
	},

	getBodyElement: function(){
		return this._composeViewImplementation.getBodyElement();
	},

	getHTMLContent: function(){
		return this._composeViewImplementation.getHTMLContent();
	},

	getTextContent: function(){
		return this._composeViewImplementation.getTextContent();
	},

	getSubject: function(){
		return this._composeViewImplementation.getSubject();
	},

	getToRecipients: function(){
		return this._composeViewImplementation.getToRecipients();
	},

	getCcRecipients: function(){
		return this._composeViewImplementation.getCcRecipients();
	},

	getBccRecipients: function(){
		return this._composeViewImplementation.getBccRecipients();
	},

	getComposeID: function(){
		return this._composeViewImplementation.getComposeID();
	},

	setToRecipients: function(emails){
		this._composeViewImplementation.setToRecipients(emails);
	},

	setCcRecipients: function(emails){
		this._composeViewImplementation.setCcRecipients(emails);
	},

	setBccRecipients: function(emails){
		this._composeViewImplementation.setBccRecipients(emails);
	},

	addOuterSidebar: function(options){
		this._composeViewImplementation.addOuterSidebar(options);
	},

	addInnerSidebar: function(options){
		this._composeViewImplementation.addInnerSidebar(options);
	},

	addMessageSendModifier: function(modifier){
		this._composeViewImplementation.addMessageSendModifier(modifier);
	}
});

module.exports = ComposeView;
