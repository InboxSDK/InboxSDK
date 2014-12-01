var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');

var ThreadView = function(){
	BasicClass.call(this);
};

ThreadView.prototype = Object.create(BasicClass.prototype);

_.extend(ThreadView.prototype, {

	getThread: function(){},

	enableSelectionMode: function(){},

	disableSelectionMode: function(){}

});

module.exports = ThreadView;
