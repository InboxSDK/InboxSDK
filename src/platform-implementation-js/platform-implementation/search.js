'use strict';

var _ = require('lodash');
var Map = require('es6-unweak-collections').Map;


var memberMap = new Map();

var Search = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
};


_.extend(Search.prototype,  {

	createFilter: function(obj) {
		var members = memberMap.get(this);
		members.driver.createSearchFilter(obj);
	}

});




module.exports = Search;
