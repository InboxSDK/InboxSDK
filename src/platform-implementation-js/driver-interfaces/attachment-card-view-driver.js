var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var AttachmentCardViewDriver = function(){
	BasicClass.call(this);
};

AttachmentCardViewDriver = Object.create(BasicClass.prototype);

_.extend(AttachmentCardViewDriver, {

	isStandardAttachment: function(){},


	addButton: function(options){}

});

module.exports = AttachmentCardViewDriver;
