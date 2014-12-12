var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var MessageViewDriver = function(){
	BasicClass.call(this);
};

MessageViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(MessageViewDriver.prototype, {

	getContentsElement: null,

	getLinks: null,

	isElementInQuotedArea: null,

	getAttachmentCardViewDrivers: null,

	addAttachmentCard: null,

	addButtonToDownloadAllArea: null,

	getEventStream: null

});

module.exports = MessageViewDriver;
