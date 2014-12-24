var _ = require('lodash');
var BasicClass = require('../../lib/basic-class');

var Route = function(options){
	BasicClass.call(this);

	this._name = options.name;
	this._driver = options.driver;
	this._isCustomRoute = options.isCustomRoute;
};

Route.prototype = Object.create(BasicClass.prototype);

_.extend(Route.prototype, {

	__memberVariables: [
		{name: '_name', destroy: false, get: true},
		{name: '_driver', destroy: false, get: false},
		{name: '_isCustomRoute', destroy: false}
	],

	createLink: function(params){
		return this._driver.createLink(this._name, params);
	},

	gotoView: function(params){
		this._driver.gotoView(this._name, params);
	},

	isCustomRoute: function(){
		return this._isCustomRoute;
	}

});

module.exports = Route;
