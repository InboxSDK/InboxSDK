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
	* rename addAttachmentCardView
	*/
	addAttachmentCard: function(cardOptions){
		this._messageViewImplementation.addAttachmentCard(cardOptions);
	},

	/*
	* options = {
	* 	tooltip: ,
	* 	icon: ,
	* 	callback: function(attachmentCardObjects)
	* }
	* rename addAttachmentsToolbarButton
	*/
	addButtonToDownloadAllArea: function(buttonOptions){
		this._messageViewImplementation.addButtonToDownloadAllArea(buttonOptions);
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
* This type is required by the <code>MessageView.addAttachmentCard</code> method to insert an <code>AttachmentCardView</code>
* for a message. An attachment card offers a way to display a rich preview of any 'attachment' to a message. Note that
* 'attachments' is referenced in the generic sense and need not be a downloadable file specifically. One example would be to
* show you YouTube attachment cards for any YouTube links present in an email.
*/
var AttachmentCardOptions = /** @lends AttachmentCardOptions */{

	/**
	* The title of the attachment card. Typically a filename is set here.
	* @type {string}
	*/
	title:null,

	/**
	* A description of the attachment card displayed subtly
	* @type {string}
	*/
	description:null,

	/**
	* The url of an "open" or "preview" action for this attachment. The attachment cards primary action (clicking on the card)
	* takes the user in a new window to the URL specified here. This is also the URL used if the user right clicks and copies
	* the link address
	* @type {function(event)}
	*/
	previewUrl:null,

	/**
	* A URL to an image representing the thumbnail preview of the attachment card
	* @type {string}
	*/
	previewThumbnailUrl:null,

	/**
	* A callback to call when the user clicks on the preview area. Note that if the previewUrl is also set,
	* the preview will open in a new window <b>in addition</b> to this callback being called. The PreviewEvent has
	* one property - <code>attachmentCardView</code>. It also has a <code>preventDefault()</code> function. Calling
	* this function prevents the preview from opening in a new window.
	* @type {function(event)}
	*/
	previewCallback:null,

	/**
	* The url of the icon of the attachment
	* @type {boolean}
	*/
	fileIconImageUrl:null,

	/**
	* An array of buttons to support functionality in addition to the preview functionality
	* @type {(DownloadButtonDescriptor|CustomButtonDescriptor)[]}
	*/
	buttons:null,

	/**
	* The color of the attachment card fold and an accompying accent color
	* ^optional
	* ^default=#BEBEBE
	* @type {string}
	*/
	foldColor:null
};


/**
* @class
*/
var DownloadButtonDescriptor = /** @lends DownloadButtonDescriptor */{

	/**
	* The url of the file to download when the user presses the download button.
	* @type {string}
	*/
	downloadUrl:null,

	/**
	* A callback that is called when the user presses the download button. Note, this is called <b>in addition</b> to file
	* actually downloading which happens automatically.
	* @type {string}
	*/
	callback:null,
};

/**
* @class
*/
var CustomButtonDescriptor = /** @lends CustomButtonDescriptor */{

	/**
	* The icon to use. Use a white image with transparent background for consistency
	* @type {string}
	*/
	iconUrl:null,

	/**
	* The tooltip to show when the user hovers over the button
	* @type {string}
	*/
	tooltip:null,

	/**
	* A callback that is called when the user presses the download button. Note, this is called <b>in addition</b> to file
	* actually downloading which happens automatically.
	* @type {string}
	*/
	callback:null,
};



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
