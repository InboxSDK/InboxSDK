var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var AttachmentAreaViewDriver = function(element){
	BasicClass.call(this);
};

AttachmentAreaViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(AttachmentAreaViewDriver.prototype, {

	getAttachmentCardViewDrivers: null,

	addAttachmentCardView: null,

	addButtonToDownloadAllArea: null

});

module.exports = AttachmentAreaViewDriver;
