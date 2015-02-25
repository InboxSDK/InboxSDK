'use strict';

var _ = require('lodash');


var MembraneMap = function(){
	this._map = new WeakMap();
};

_.extend(MembraneMap.prototype, {

	set: function(viewDriver, view){
		this._map.set(viewDriver, view);
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
