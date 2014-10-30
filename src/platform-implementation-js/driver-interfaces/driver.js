var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var Driver = function(){
	BasicClass.call(this);
};

Driver.prototype = Object.create(BasicClass.prototype);

_.extend(Driver.prototype, {

	getComposeViewDriverStream: function(){},

	getThreadViewDriverStream: function(){},

	getMessageViewDriverStream: function(){},

	getReplyViewDriverStream: function(){},

	getAttachmentCardViewDriverStream: function(){}

});

module.exports = Driver;
