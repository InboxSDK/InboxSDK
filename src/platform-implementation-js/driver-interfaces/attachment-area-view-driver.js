var BasicClass = require('../lib/basic-class');

var AttachmentAreaViewDriver = function(element){

};

AttachmentAreaViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(AttachmentAreaViewDriver.prototype, {

	getAttachmentCardViewDrivers: function(){},


	addAttachmentCardView: function(attachmentCardView){},

	addButtonToDownloadAllArea: function(options){}

});

module.exports = AttachmentAreaViewDriver;
