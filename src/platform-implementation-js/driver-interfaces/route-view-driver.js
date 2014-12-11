var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var RouteViewDriver = function(){
	BasicClass.call(this);
};

RouteViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(RouteViewDriver.prototype, {

	getName: function(){},

	getParams: function(){},

	isCustomView: function(){},

	getCustomViewElement: function(){},

	getEventStream: function(){}

});

module.exports = RouteViewDriver;
