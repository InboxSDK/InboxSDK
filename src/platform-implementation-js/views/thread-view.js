var _ = require('lodash');
var BasicClass = require('../../basic-class');

var ThreadView = function(){
	BasicClass.call(this);
};

ThreadView.prototype = Object.create(BasicClass.prototype);

_extend(ThreadView.prototype, {

	getThread: function(){},

	enableSelectionMode: function(){},

	disableSelectionMode: function(){}

});

module.exports = ThreadView;
