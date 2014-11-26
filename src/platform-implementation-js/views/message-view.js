var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var AttachmentCardView = require('./attachment-card-view');

/**
* @class
* Object that represents a visible message in the UI. There are properties to access data about the message
* itself as well as change the state of the UI.
*/
var MessageView = function(messageViewImplementation){
	BasicClass.call(this);

	this._messageViewImplementation = messageViewImplementation;
};

MessageView.prototype = Object.create(BasicClass.prototype);

_.extend(MessageView.prototype, /** @lends MessageView */{

	/*
	* options = {
	* 	title: ,
	*  fileName: ,
	*  previewUrl: ,
	*  downloadUrl: ,
	*  callback: ,
	*  fileIconImageUrl: ,
	*  documentPreviewImageUrl ,
	*  color:
	* }
	* rename addAttachmentCardView
	*/
	addAttachmentCard: function(options){
		this._messageViewImplementation.addAttachmentCard(options);
	},

	/*
	* options = {
	* 	tooltip: ,
	* 	icon: ,
	* 	callback: function(attachmentCardObjects)
	* }
	* rename addAttachmentsToolbarButton
	*/
	addButtonToDownloadAllArea: function(options){
		this._messageViewImplementation.addButtonToDownloadAllArea(options);
	},


	// rename getBodyElement

	/**
	* Returns the body element of the message as displayed to the user. This element includes any qouted areas.
	* Use this method when you want to decorate the body of the message,
	* i.e. if you wanted to linkify all dates you found in a message for scheduling purposes
	* @return {HTMLElement}
	*/
	getContentsElement: function(){
		return this._messageViewImplementation.getContentsElement();
	},

	// returns array of attachment card views
	getAttachmentCardViews: function(){
		return _.map(this._messageViewImplementation.getAttachmentCardViewDrivers(), function(attachmentCardViewDriver){
			return new AttachmentCardView(attachmentCardViewDriver);
		});
	},


	/**
	* Returns whether the element you provided or not is contained within the qouted area of the MessageView. This is useful
	* when you want to parse through the contents of the <code>HTMLElement</code> returned by <code>getContentsElement</code>
	* and test whether one if its children is in the qouted area (because you'll usually ignore those elements).
	* @return {boolean}
	*/
	isElementInQuotedArea: function(element){
		this._messageViewImplementation.isElementInQuotedArea(element);
	},
	

	// rename getLinksInBody

	/**
	* Returns an array of MessageViewLinkDescriptors representing all the links in the message and their associated metadata.
	* This is useful when you want to parse links in a message and take some action on them, this takes care of detecting whether
	* the link is in the qouted area or not and parsing out the url/anchor text of the link.
	* i.e. if you wanted to linkify all dates you found in a message for scheduling purposes
	* @return {MessageViewLinkDescriptor[]}
	*/
	getLinks: function(){
		return this._messageViewImplementation.getLinks();
	}

});


module.exports = MessageView;





/**
* @class
* This type returned by the <code>MessageView.getLinksInBody</code> describing links found in a message body
*/
var MessageViewLinkDescriptor = /** @lends MessageViewLinkDescriptor */{

	/**
	* The anchor text of the link
	* @type {string}
	*/
	text:null,

	/**
	* The html string of the link found
	* @type {string}
	*/
	html:null,

	/**
	* The actual <code>HTMLElement</code> of the link found
	* @type {function(event)}
	*/
	element:null,

	/**
	* The url of the link
	* @type {string}
	*/
	href:null,

	/**
	* Whether the link was found in the qouted area of the message or not
	* @type {boolean}
	*/
	isInQuotedArea:null
};
