var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var FullscreenViewDriver = function(){
	BasicClass.call(this);
};

FullscreenViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(FullscreenViewDriver.prototype, {

	getName: function(){},

	getParams: function(){},

	isCustomView: function(){},

	getCustomViewElement: function(){},

	getEventStream: function(){}

});

module.exports = FullscreenViewDriver;
