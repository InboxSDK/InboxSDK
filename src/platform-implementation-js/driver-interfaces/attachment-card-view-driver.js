var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var AttachmentCardViewDriver = function(){
	BasicClass.call(this);
};

AttachmentCardViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(AttachmentCardViewDriver.prototype, {

	getAttachmentType: function(){},


	addButton: function(options){}

});

module.exports = AttachmentCardViewDriver;
