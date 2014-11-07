var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');

var FullscreenView = function(options){
	BasicClass.call(this);

	this.params = options.params;
	this.fullscreenViewDescriptor = options.fullscreenViewDescriptor;
};

FullscreenView.prototype = Object.create(BasicClass.prototype);

_.extend(FullscreenView.prototype, {

	__memberVariables: [
		{name: 'params', destroy: false},
		{name: 'fullscreenViewDescriptor', destroy: false}
	]

});

module.exports = FullscreenView;
