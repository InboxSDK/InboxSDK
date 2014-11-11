var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;


var ComposeView = function(composeViewImplementation){
	EventEmitter.call(this);

	this._composeViewImplementation = composeViewImplementation;
	//this._bindToComposeEvents();
};

ComposeView.prototype = Object.create(EventEmitter.prototype);

_.extend(ComposeView.prototype, {

	/*
	 * adds button to the compose
	 */
	addButton: function(buttonDescriptor){
		var buttonOptions = _.clone(buttonDescriptor);
		if(buttonDescriptor.hasDropdown){
			buttonOptions.preMenuShowFunction = function(menuView){
				buttonDescriptor.onClick({
					dropdown: {
						el: menuView.getElement()
					}
				});
			};
		}
		else{
			buttonOptions.activateFunction = buttonDescriptor.onClick;
		}

		buttonOptions.noArrow = true;
		buttonOptions.tooltip = buttonOptions.tooltip || buttonOptions.title;
		delete buttonOptions.title;

		this._composeViewImplementation.addButton(buttonOptions);
	},

	/*
	 * inserts link into body
	 * returns a promise for when the insert actually happens
	 */
	insertLinkIntoBody: function(text, href){
		this._composeViewImplementation.insertLinkIntoBody(text, href);
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
		return this._composeViewImplementation.getFormType();
	},

	/*
	 * closes the compose window
	 */
	close: function(){
		this._composeViewImplementation.close();
	},


	/*
	 * Places text inside the body of the message at the cursor or at the beginning of the message if the cursor is not in the body of the message. If anything inside the body is selected, it will be replaced.
	 */
	insertBodyTextAtCursor: function(text){
		this._composeViewImplementation.insertBodyTextAtCursor(text);
	},

	/*
	 * Places html inside the body of the message at the cursor or at the beginning of the message if the cursor is not in the body of the message. If anything inside the body is selected, it will be replaced.
	 */
	insertBodyHTMLAtCursor: function(html){
		this._composeViewImplementation.insertBodyHTMLAtCursor(html);
	},

	/*
	 * Returns a string containing any text and elements highlighted by the user inside the email body.
	 */
	getSelectedBodyHTML: function(){
		return this._composeViewImplementation.getSelectedBodyHTML();
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
	},


	_bindToComposeEvents: function(){
		var self = this;
		this._composeViewImplementation.getEventStream().onValue(function(event){

		});
	}
});

module.exports = ComposeView;
