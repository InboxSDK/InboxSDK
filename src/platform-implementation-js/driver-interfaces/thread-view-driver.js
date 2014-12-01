var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var ThreadViewDriver = function(element){
	BasicClass.call(this);
};

ThreadViewDriver.prototype = BasicClass.prototype;

_.extend(ThreadViewDriver.prototype, {

	addSidebarContentPanel: function(descriptor){}

});

module.exports = ThreadViewDriver;
