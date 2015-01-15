'use strict';

var _ = require('lodash');
var BasicClass = require('./basic-class');
var Map = require('es6-unweak-collections').Map;


var MembraneMap = function(){
	BasicClass.call(this);

	this._map = new Map();
};

MembraneMap.prototype = Object.create(BasicClass.prototype);

_.extend(MembraneMap.prototype, {

	__memberVariables: [
		{name: '_map', destroy: false}
	],

	set: function(viewDriver, view){
		this._map.set(viewDriver, view);

		var self = this;
		view.on('destroy', function(){
			self._map.delete(viewDriver);
		});
	},

	get: function(viewDriver){
		return this._map.get(viewDriver);
	},

	has: function(viewDriver){
		return this._map.has(viewDriver);
	},

	delete: function(viewDriver){
		this._map.delete(viewDriver);
	}

});

module.exports = MembraneMap;
