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

	registerSearchQueryRewriter: function(obj) {
		if (typeof obj.termReplacer != 'function' || typeof obj.term != 'string') {
			throw new Error("Incorrect arguments");
		}
		if (!obj.term.match(/^app:/)) {
			throw new Error("Custom search term must begin with 'app:'");
		}
		var members = memberMap.get(this);
		members.driver.createSearchFilter(obj);
	},

	/* Proposed. Probably would have to return promises.
	generateSearchQueryForMessagesByThreadID: function(ids) {

	},

	generateSearchQueryForMessagesByID: function(ids) {

	},*/

	generateSearchQueryForMessagesByRfcID: function(ids) {
		return ids.map(function(id) {
			return 'rfc822msgid:' + id;
		}).join(' OR ');
	}

});




module.exports = Search;
