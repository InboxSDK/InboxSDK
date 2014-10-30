var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var AttachmentCardView = function(attachmentCardImplementation){
	BasicClass.call(this);

	this._attachmentCardImplementation = attachmentCardImplementation;
};

AttachmentCardView.prototype = Object.create(BasicClass.prototype);

_.extend(AttachmentCardView.prototype, {

	// returns true/false depending on if this attachment card is a regular downloadable attachment
	isStandardAttachment: function(){
		return this._attachmentCardImplementation.isStandardAttachment();
	},


	/*
	 * options = {
	 * 	iconClass: ,
	 * 	tooltip,
	 * 	callback:
	 * }
	 */
	addButton: function(options){
		this._attachmentCardImplementation.addButton(options);
	}

});

module.exports = AttachmentCardView;
