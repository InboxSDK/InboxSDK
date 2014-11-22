var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var AttachmentCardView = require('./attachment-card-view');

var MessageView = function(messageViewImplementation){
	BasicClass.call(this);

	this._messageViewImplementation = messageViewImplementation;
};

MessageView.prototype = Object.create(BasicClass.prototype);

_.extend(MessageView.prototype, {

	// rename getBodyElement

	// returns root dom element for the message
	getContentsElement: function(){
		return this._messageViewImplementation.getContentsElement();
	},


	// rename getLinksInBody
	/*
	 * returns an array of objects
	 *
	 * [{
	 * 	text: 'foo',
	 * 	html: '<b>foo</b>',
	 * 	href: 'http://blah',
	 * 	element: element,
	 * 	isInQuotedArea: true/false
	 * }]
	 */
	getLinks: function(){
		return this._messageViewImplementation.getLinks();
	},

	// boolean returns if element is in a quoted area of content or not
	isElementInQuotedArea: function(element){
		this._messageViewImplementation.isElementInQuotedArea(element);
	},

	// returns array of attachment card views
	getAttachmentCardViews: function(){
		return _.map(this._messageViewImplementation.getAttachmentCardViewDrivers(), function(attachmentCardViewDriver){
			return new AttachmentCardView(attachmentCardViewDriver);
		});
	},

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
	}

});


module.exports = MessageView;
