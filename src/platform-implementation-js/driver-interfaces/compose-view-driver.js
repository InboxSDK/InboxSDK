var _ = require('lodash');
var BasicClass = require('../lib/basic-class');


var ComposeWindowDriver = function(){
	BasicClass.call(this);
};

ComposeWindowDriver.prototype = Object.create(BasicClass.prototype);

_.extend(ComposeWindowDriver.prototype, {

	insertLinkIntoBody: function(text, href){},

	addButton: function(buttonDescriptor){}

});


module.exports = ComposeWindowDriver;

