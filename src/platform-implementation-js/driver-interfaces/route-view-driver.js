var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var RouteViewDriver = function(){
	BasicClass.call(this);
};

RouteViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(RouteViewDriver.prototype, {

	getName: null,

	getParams: null,

	getEventStream: null

});

module.exports = RouteViewDriver;
