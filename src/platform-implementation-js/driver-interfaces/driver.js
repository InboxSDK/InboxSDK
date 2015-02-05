var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var Driver = function(){
	BasicClass.call(this);
};

Driver.prototype = Object.create(BasicClass.prototype);

_.extend(Driver.prototype, {

	getLogger: null,

	showCustomRouteView: null,

	showNativeRouteView: null,

	createLink: null,

	goto: null,

	addNavItem: null,

	getComposeViewDriverStream: null,

	getThreadViewDriverStream: null,

	getMessageViewDriverStream: null,

	getReplyViewDriverStream: null,

	getToolbarViewDriverStream: null,

	getRouteViewDriverStream: null,

	getNativeViewNames: null

});

module.exports = Driver;
