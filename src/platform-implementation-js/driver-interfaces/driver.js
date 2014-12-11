var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var Driver = function(){
	BasicClass.call(this);
};

Driver.prototype = Object.create(BasicClass.prototype);

_.extend(Driver.prototype, {

	showCustomRouteView: function(element){},

	showNativeRouteView: function(){},

	getComposeViewDriverStream: function(){},

	getThreadViewDriverStream: function(){},

	getMessageViewDriverStream: function(){},

	getReplyViewDriverStream: function(){},

	getToolbarViewDriverStream: function(){},

	getRouteViewDriverStream: function(){},

	getNativeViewNames: function(){}

});

module.exports = Driver;
