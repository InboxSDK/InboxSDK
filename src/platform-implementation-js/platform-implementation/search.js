'use strict';

var _ = require('lodash');

var memberMap = new WeakMap();

// documented in src/docs/
var Search = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
};

_.extend(Search.prototype, {

	registerSearchSuggestionsProvider(handler) {
		if (typeof handler != 'function') {
			throw new Error("Incorrect arguments");
		}
		var members = memberMap.get(this);
		members.driver.registerSearchSuggestionsProvider(handler);
	},

	registerSearchQueryRewriter(rewriter) {
		if (typeof rewriter.termReplacer != 'function' || typeof rewriter.term != 'string') {
			throw new Error("Incorrect arguments");
		}
		if (!rewriter.term.match(/^(app|has):/)) {
			throw new Error("Custom search term must begin with 'app:'");
		}
		var members = memberMap.get(this);
		members.driver.registerSearchQueryRewriter(rewriter);
	}

});

module.exports = Search;
