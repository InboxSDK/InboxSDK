var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var ComposeWindowDriver = function(){
	BasicClass.call(this);
};

ComposeWindowDriver.prototype = Object.create(BasicClass.prototype);

_.extend(ComposeWindowDriver.prototype, {

	insertBodyTextAtCursor: null,

	insertBodyHTMLAtCursor: null,

	/*
	 * returns a promise for when the insert actually happens
	 */
	insertLinkIntoBody: null,

	setSubject: null,

	setToRecipients: null,

	setCcRecipients: null,

	setBccRecipients: null,

	close: null,

	addButton: null,

	addOuterSidebar: null,

	addInnerSidebar: null,

	addMessageSendModifier: null,

	isReply: null,

	isInlineReplyForm: null,

	getBodyElement: null,

	getHTMLContent: null,

	getTextContent: null,

	getSelectedBodyHTML: null,

	getSelectedBodyText: null,

	getSubject: null,

	getToRecipients: null,

	getCcRecipients: null,

	getBccRecipients: null,

	getComposeID: null,

	getEventStream: null

});


module.exports = ComposeWindowDriver;
