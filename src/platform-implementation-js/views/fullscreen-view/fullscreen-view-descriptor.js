var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');

var FullscreenViewDescriptor = function(options){
	BasicClass.call(this);

	this._name = options.name;
	this._driver = options.driver;
	this._isCustomView = options.isCustomView;
};

FullscreenViewDescriptor.prototype = Object.create(BasicClass.prototype);

_.extend(FullscreenViewDescriptor.prototype, {

	__memberVariables: [
		{name: '_name', destroy: false, get: true},
		{name: '_driver', destroy: false, get: false},
		{name: '_isCustomView', destroy: false}
	],

	createLink: function(params){
		return this._driver.createLink(this._name, params);
	},

	gotoView: function(params){
		this._driver.gotoView(this._name, params);
	},

	isCustomView: function(){
		return this._isCustomView;
	}

});

module.exports = FullscreenViewDescriptor;
