var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var ComposeWindowDriver = function(){
	BasicClass.call(this);
};

ComposeWindowDriver.prototype = Object.create(BasicClass.prototype);

_.extend(ComposeWindowDriver.prototype, {

	/*
	 * returns a promise for when the insert actually happens
	 */
	insertLinkIntoBody: function(text, href){},

	addButton: function(buttonDescriptor){},

	isReply: function(){},

	setIsReply: function(value){}



});


module.exports = ComposeWindowDriver;

