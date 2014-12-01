var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');

var AttachmentCardView = function(attachmentCardImplementation){
	BasicClass.call(this);

	this._attachmentCardImplementation = attachmentCardImplementation;
};

AttachmentCardView.prototype = Object.create(BasicClass.prototype);

_.extend(AttachmentCardView.prototype, {

	// returns string indicating the type of attachment ['FILE', 'DRIVE', 'FILE_IMAGE', 'CUSTOM']
	getAttachmentType: function(){
		return this._attachmentCardImplementation.getAttachmentType();
	},


	/*
	 * options = {
	 * 	iconUrl: ,
	 * 	tooltip,
	 * 	onClick:
	 * }
	 */
	addButton: function(options){
		this._attachmentCardImplementation.addButton(options);
	}

});

module.exports = AttachmentCardView;
