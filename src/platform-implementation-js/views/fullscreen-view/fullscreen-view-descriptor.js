var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');

var FullscreenViewDescriptor = function(options){
	BasicClass.call(this);

	this._name = options.name;
	this._isNative = options.isNative;
};

FullscreenViewDescriptor.prototype = Object.create(BasicClass.prototype);

_.extend(FullscreenViewDescriptor.prototype, {

	__memberVariables: [
		{name: '_name', destroy: false, get: true},
		{name: '_isNative', destroy: false}
	],

	createLink: function(params){

	},

	gotoView: function(params){

	},

	isNative: function(){
		return this._isNative;
	}

});

module.exports = FullscreenViewDescriptor;
