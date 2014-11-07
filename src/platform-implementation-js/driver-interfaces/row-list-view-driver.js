var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var RowListViewDriver = function(){
	BasicClass.call(this);
};

RowListViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(RowListViewDriver.prototype, {

	__memberVariables: [
		{name: '_toolbarViewDriver', destroy: true, get: true, set: true},
		{name: '_rowViewDrivers', destroy: true, get: true, defaultValue: []}
	]

});

module.exports = RowListViewDriver;
