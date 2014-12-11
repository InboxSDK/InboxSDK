var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var ToolbarViewDriver = function(){
	BasicClass.call(this);
};

ToolbarViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(ToolbarViewDriver.prototype, {

	addButton: null

});

module.exports = ToolbarViewDriver;
