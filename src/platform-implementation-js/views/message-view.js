var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var MessageView = function(messageViewImplementation){
	BasicClass.call(this);

	this._messageViewImplementation = messageViewImplementation;
};

MessageView.prototype = Object.create(BasicClass.prototype);

_.extend(MessageView.prototype, {

	// returns root dom element for the message
	getContentsElement: function(){
		return this._messageViewImplementation.getContentsElement();
	},

	// boolean returns if element is in a quoted area of content or not
	isElementInQuotedArea: function(element){
		this._messageViewImplementation.isElementInQuotedArea(element);
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
	 *
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
	 *
	 */
	addButtonToDownloadAllArea: function(options){
		this._messageViewImplementation.addButtonToDownloadAllArea(options);
	}

});


module.exports = MessageView;

