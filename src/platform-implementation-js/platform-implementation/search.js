'use strict';

var _ = require('lodash');

var memberMap = new WeakMap();


/**
* @class
* This namespace allows you to interact Gmail and Inbox's default search behaviour.
* It allows for two use cases: 1) To provide autocomplete suggestions as the user
* types in their query and 2) To rewrite sarch queries.
*/
var Search = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
};


_.extend(Search.prototype,  /** @lends Search */{

	/**
	* Registers a search autocomplete suggestion provider. This allows you to add results to Gmails
	* autocomplete results when a user types into a search box. Each providers results are visually
	* seperated from each other in the UI.
	* @param {function(query)} handler - a handler that takes in a string <code>query</code> and
	* returns an <code>Array</code> (or <code>Promise</code> for one) of
	* <code>AutocompleteSearchResult</code>s.
	* @return {void}
	*/
	registerSearchSuggestionsProvider: function(handler) {
		if (typeof handler != 'function') {
			throw new Error("Incorrect arguments");
		}
		var members = memberMap.get(this);
		members.driver.registerSearchSuggestionsProvider(handler);
	},

	/**
	* Allows you to rewrite certain queries that may be typed in or programatically set. If a
	* user types in a search, their search term will still be visible but the search that is
	* actually executed by Gmails servers will be what you rewrite the query to.
	*
	* One common use case is to have a special view that shows emails that your app wants to render. You can
	* navigate the user to a specific search results view (using <code>Router</code>) programtically with a
	* search term of your choosing (so its displayed to the user), and then use <code>registerSearchQueryRewriter</code>
	* to make sure the results you want are shown.
	* @param {SearchQueryRewriter} rewriter - a rewriter object that specifies the term to rewrite and a function to
	* get the new query
	* @return {void}
	*/
	registerSearchQueryRewriter: function(rewriter) {
		if (typeof rewriter.termReplacer != 'function' || typeof rewriter.term != 'string') {
			throw new Error("Incorrect arguments");
		}
		if (!rewriter.term.match(/^app:/)) {
			throw new Error("Custom search term must begin with 'app:'");
		}
		var members = memberMap.get(this);
		members.driver.registerSearchQueryRewriter(rewriter);
	},

	/**
	* A convenience function that generates a search query for threads matching RFC2822 Message-Id headers.
	* This is typically used when you want to specifically show messages with a given ID
	* @param {String[]} ids - an array of RFC2822 Message-IDs
	* @return {String} a search query
	*/
	generateSearchQueryForMessagesByRfcID: function(ids) {
		return ids.map(function(id) {
			return 'rfc822msgid:' + id;
		}).join(' OR ');
	}

});




module.exports = Search;


/**
* @class
* This type is returned by the function you pass into the
* <code>Search.registerSearchSuggestionsProvider</code> method as a way to add
* autocomplete suggestions to the Gmail/Inbox search box.
*/
var AutocompleteSearchResult = /** @lends AutocompleteSearchResult */ {

	/**
	* The name of the result to display. This property or <code>nameHTML</code> must be set
	* @type{String}
	*/
	name:  null,

	/**
	* HTML to display in the name area of the result. This property or <code>name</code> must be set
	* @type{String}
	*/
	nameHTML: null,

	/**
	* The name of the result to display. This property or <code>nameHTML</code> must be set
	* ^optional
	* ^default=empty
	* @type{String}
	*/
	description:  null,

	/**
	* HTML to display in the name area of the result. This property or <code>name</code> must be set
	* ^optional
	* ^default=empty
	* @type{String}
	*/
	descriptionHTML: null,


	/**
	* URL for the icon to show in the result. Should be a local extension file URL or a HTTPS url
	* ^optional
	* ^default=empty
	* @type {String}
	*/
	iconUrl: null,

	/**
	* The name of the route to navigate to when the autocomplete search result is selected
	* ^optional
	* ^default=empty
	* @type {String}
	*/
	routeName: null,

	/**
	* The parameters of the route being navigated to when the autocomplete search result is selected
	* ^optional
	* ^default=[]
	* @type {String[]}
	*/
	routeParams: null,

	/**
	* An external URL to navigate to when the autocomplete search result is selected
	* ^optional
	* ^default=empty
	* @type {String}
	*/
	externalURL: null
};


/**
* @class
* This type is passed into the
* <code>Search.registerSearchQueryRewriter</code> method as a way to add
* rewrite search queries
*/
var SearchQueryRewriter = /** @lends SearchQueryRewriter */ {

	/**
	* The query term that you'd like to rewrite/replace. No wildcards are currently supported.
	* @type{String}
	*/
	term:  null,

	/**
	* A function which takes returns a String (or Promise) with the query to actually perform
	* @type{function}
	*/
	termReplacer: null
};
