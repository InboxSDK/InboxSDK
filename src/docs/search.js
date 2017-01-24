/**
* @class
* This namespace allows you to interact Gmail and Inbox's default search behaviour.
* It allows for two use cases: 1) To provide autocomplete suggestions as the user
* types in their query and 2) To rewrite sarch queries.
*/
var Search = /** @lends Search */{

	/**
	* Registers a search autocomplete suggestion provider. This allows you to add results to Gmails
	* autocomplete results when a user types into a search box. Each providers results are visually
	* seperated from each other in the UI.
	* ^gmail
	* @param {function(query)} handler - A handler that takes in a string {query} and
	* returns an {Array} (or {Promise} for one) of {AutocompleteSearchResult}s.
	* @return {void}
	*/
	registerSearchSuggestionsProvider: function(){},

	/**
	* Allows you to rewrite certain queries that may be typed in or programatically set. If a
	* user types in a search, their search term will still be visible but the search that is
	* actually executed by Gmails servers will be what you rewrite the query to.
	*
	* One common use case is to have a special view that shows emails that your app wants to render. You can
	* navigate the user to a specific search results view (using {Router}) programtically with a
	* search term of your choosing (so its displayed to the user), and then use {registerSearchQueryRewriter}
	* to make sure the results you want are shown.
	* ^gmail
	* @param {SearchQueryRewriter} rewriter - A rewriter object that specifies the term to rewrite and a function to
	* get the new query.
	* @return {void}
	*/
	registerSearchQueryRewriter: function(){}

};


/**
* @class
* This type is returned by the function you pass into the
* {Search.registerSearchSuggestionsProvider()} method as a way to add
* autocomplete suggestions to the Gmail/Inbox search box.
*/
var AutocompleteSearchResult = /** @lends AutocompleteSearchResult */ {

	/**
	* The name of the result to display. This property or {nameHTML} must be set.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	name: null,

	/**
	* HTML to display in the name area of the result. This property or {name} must be set.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	nameHTML: null,

	/**
	* The name of the result to display. This property or {descriptionHTML} must be set.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	description: null,

	/**
	* HTML to display in the name area of the result. This property or {description} must be set.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	descriptionHTML: null,


	/**
	* URL for the icon to show in the result. Should be a local extension file URL or a HTTPS url.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconUrl: null,

	/**
	* The name of the route to navigate to when the autocomplete search result is selected.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	routeName: null,

	/**
	* The parameters of the route being navigated to when the autocomplete search result is selected.
	* ^optional
	* ^default=[]
	* @type {string[]}
	*/
	routeParams: null,

	/**
	* An external URL to navigate to when the autocomplete search result is selected.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	externalURL: null,

	/**
	* A function to call when the autocomplete search result is selected.
	* ^optional
	* ^default=null
	* @type {func()}
	*/
	onClick: null
};


/**
* @class
* This type is passed into the
* {Search.registerSearchQueryRewriter()} method as a way to add
* rewrite search queries.
*/
var SearchQueryRewriter = /** @lends SearchQueryRewriter */ {

	/**
	* The query term that you'd like to rewrite/replace. No wildcards are currently supported.
	* Currently it must begin with "app:" or "has:".
	* @type {string}
	*/
	term: null,

	/**
	* A function which takes returns a String (or Promise) with the query to actually perform.
	* @type {function}
	*/
	termReplacer: null
};
