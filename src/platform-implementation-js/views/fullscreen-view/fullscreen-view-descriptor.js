var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');

var FullscreenViewDescriptor = function(options){
	BasicClass.call(this);

	this._name = options.name;
	this._isCustomView = options.isCustomView;
};

FullscreenViewDescriptor.prototype = Object.create(BasicClass.prototype);

_.extend(FullscreenViewDescriptor.prototype, {

	__memberVariables: [
		{name: '_name', destroy: false, get: true},
		{name: '_isCustomView', destroy: false}
	],

	createLink: function(params){

	},

	gotoView: function(params){

	},

	isCustomView: function(){
		return this._isCustomView;
	}

});

module.exports = FullscreenViewDescriptor;
