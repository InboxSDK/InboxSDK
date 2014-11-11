var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');

var FullscreenView = function(fullscreenViewImplementation, fullscreenViewDescriptor){
	BasicClass.call(this);

	this._fullscreenViewImplementation = fullscreenViewImplementation;
	this._fullscreenViewDescriptor = fullscreenViewDescriptor;
};

FullscreenView.prototype = Object.create(BasicClass.prototype);

_.extend(FullscreenView.prototype, {

	__memberVariables: [
		{name: '_fullscreenViewDescriptor', destroy: false},
		{name: '_fullscreenViewImplementation', destroy: true}
	],

	getParams: function(){
		return this._fullscreenViewImplementation.getParams();
	},

	getDescriptor: function(){
		return this._fullscreenViewDescriptor;
	},

	getElement: function(){
		return this._fullscreenViewImplementation.getCustomViewElement();
	}

});

module.exports = FullscreenView;
