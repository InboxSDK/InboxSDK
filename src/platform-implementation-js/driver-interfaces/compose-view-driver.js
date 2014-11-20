var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var ComposeWindowDriver = function(){
	BasicClass.call(this);
};

ComposeWindowDriver.prototype = Object.create(BasicClass.prototype);

_.extend(ComposeWindowDriver.prototype, {

	insertBodyTextAtCursor: function(text){},

	insertBodyHTMLAtCursor: function(html){},

	/*
	 * returns a promise for when the insert actually happens
	 */
	insertLinkIntoBody: function(text, href){},

	setSubject: function(text){},

	setToRecipients: function(emails){},

	setCcRecipients: function(emails){},

	setBccRecipients: function(emails){},

	close: function(){},

	addButton: function(buttonDescriptor){},

	addOuterSidebar: function(options){},

	addInnerSidebar: function(options){},

	addMessageSendModifier: function(modifier){},

	isReply: function(){},

	isInlineReplyForm: function(){},

	getBodyElement: function(){},

	getHTMLContent: function(){},

	getTextContent: function(){},

	getSelectedBodyHTML: function(){},

	getSelectedBodyText: function(){},

	getSubject: function(){},

	getToRecipients: function(){},

	getCcRecipients: function(){},

	getBccRecipients: function(){},

	getComposeID: function(){},

	getEventStream: function(){}

});


module.exports = ComposeWindowDriver;
