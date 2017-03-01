/**
* @class
* This namespace contains functionality associated with creating your own content inside Gmail or Inbox. It allows you to define "Routes"
* which define a full page of content and an associated URL space for which they are active. You can think of routes as different pages
* in your application. Gmail and Inbox already have a few routes built in (Inbox, Sent, Drafts, etc). This namespace allows you to define
* your own as well as listen in on the built in routes being navigated to.
*
* This is typically used when you want to create content to fill the main content area of Gmail or Inbox.
*
* Every route has a URL associated with it and can have optional parameters. However, you never construct these URL's manually.
* The SDK will take care of creating a URL that will work in Gmail/Inbox for your Route. Since these URL's may change due to
* implementations of Gmail/Inbox, you should always create new links when trying to set URL on elements or simply use the goto
* function which naviagtes to the created link automatically.
*
* Using the {handleX} family of methods, you can specify which routes your application can handle. You will be called back with
* and instance of a RouteView or similar when the user navigates to a route you've declared you can handle. For custom routes, you'll typically
* add your own content and for built in routes, you'll typically modify the existing content.
*
* Route ID's are path like strings with named parameters, for example: "myroute/:someParamMyRouteNeeds".
*/
var Router = /** @lends Router */ {

	/**
	* Get a URL that can be used to navigate to a view. You'll typically want to use this to set the href of an <a> element or similar.
	* Returns the encoded URL string.
	* ^gmail
	* ^inbox
	* @param {string} routeID - A route specifying where the link should navigate the user to.
	* @param {Object} params - an object containing the parameters that will be encoded in the link and decoded when the user
	* subsequently visits the route. Handlers for the specified routeID will receive a copy of this object. This object must contain
	* only simple key value pairs with no nested arrays/objects.
	* @return {string}
	*/
	createLink: function(){},

	/**
	* Change the route to be the one with the given ID and have the given parameters
	* ^gmail
	* ^inbox
	* @param {string} routeID - A route specifying where the link should navigate the user to.
	* @param {Object} params - an object containing the parameters that will be encoded in the link and decoded when the user
	* subsequently visits the route. Handlers for the specified routeID will receive a copy of this object. This object must contain
	* only simple key value pairs with no nested arrays/objects.
	* @return {void}
	*/
	goto: function(){},

	/**
	* Registers a handler (callback) to be called when the user navigates to a custom route which matches the routeID you provide.
	* Use this to create your own routes (pages) with your own custom content. Your callback will be passed an instance of a
	* {CustomRouteView} whose contents you may modify. Returns a function which can be called to unregister the route handler.
	* ^gmail
	* ^inbox
	* @param {string} routeID - which route this handler is registering for
	* @param {func(CustomRouteView)} handler - The callback to call when the route changes to a custom route matching
	* the provided routeID
	* @return {function}
	*/
	handleCustomRoute: function(){},

	/**
	* Registers a handler (callback) to be called when the user navigates to any route (both customs and built in routes).
	* Because this can apply to any route, your callback will be given only a generic {RouteView}. This is typically used
	* when you want to monitor for page changes but don't necessarily need to modify the page. Returns a function
	* which can be called to unregister the route handler.
	* ^gmail
	* @param {func(RouteView)} handler - The callback to call when the route changes
	* @return {function}
	*/
	handleAllRoutes: function(){},

	/**
	* Registers a handler (callback) to be called when the user navigates to a list route which matches the routeID you provide.
	* Gmail and Inbox have several built in routes which are "Lists". These include routes like Inbox, All Mail, Sent, Drafts, etc.
	* You'll typically use this to modify Gmail's and Inbox's built in List routes.  Returns a function which can be called
	* to unregister the route handler.
	* ^gmail
	* @example
InboxSDK.load('1', 'MY_APP_ID').then(function(sdk) {
	var unregister = sdk.Router.handleListRoute(Router.NativeListRouteIDs.SEARCH, function(inboxView) {
		console.log(inboxView);
	});
  unregister(); // Stop handling list route
});
	* @param {NativeListRouteIDs} routeID - which list route this handler is registering for.
	* @param {func(ListRouteView)} handler - The callback to call when the route changes to a list route matching the routeId.
	* @return {function}
	*/
	handleListRoute: function(){},

	/**
	* Used to create a custom view that shows a list of threads. When the user navigates
	* to the given routeID, the handler function will be called. The handler function
	* will be passed the starting offset (if the user sees 50 threads per page and is on
	* page 2, then the offset will be 50), and a maximum number of threads to return.
	* It must return a {CustomListDescriptor}, or a promise which resolves to one.
	*
	* Returns a function which can be called to unregister the route handler.
	* ^gmail
	* @param {string} routeID - Which route this handler is registering for.
	* @param {function(offset, max)} handler - Passed a page offset and a maximum
	* number of threads to return. Must return a {CustomListDescriptor}, or a promise which resolves to one.
	* @return {function}
	*/
	handleCustomListRoute: function() {},

	/**
	* Gets the current route view
	* ^gmail
	* @return {RouteView}
	*/
	getCurrentRouteView: function(){}

};

/**
 * @class
 * This type is returned from the handler function passed to
 * {Router.handleCustomListRoute()} as a way to configure the custom list route.
 */
var CustomListDescriptor = /** @lends CustomListDescriptor */{
	/**
	 * An array of threads to display in the custom list view. Each thread may
	 * be in the form of a {ThreadDescriptor} object or a string that is:
	 * 1. A Gmail Thread ID.
	 * 2. A message's Message-ID header (which must start with "<" and end with ">").
	 *
	 * If you already have both the Gmail Thread ID *and* the Message-ID header
	 * in your existing data for a given message, supply a {ThreadDescriptor}
	 * with both an {rfcMessageId} and a {gmailThreadId} for better performance.
	 * If you only have one of the two, the SDK will performantly fetch and cache
	 * the necessary information automatically.
	 * @type {Array.<ThreadDescriptor|String>}
	 */
	threads: null,

	/**
	 * The total number of threads in the custom list view. Note that this is
	 * different from the number of threads currently shown on the page (e.g.
	 * there may only be 50 threads currently shown on the page but 150 total
	 * threads in the list, in this case {total} would be 150). If you won't know
	 * the total number until you've reached the end of the list (e.g. you're
	 * fetching data from a search API where calculating a total is expensive),
	 * omit this property and use {hasMore} instead.
	 * ^optional
	 * @type {Number}
	 */
	total: null,

	/**
	 * A boolean representing whether or not there are more threads to be shown
	 * after the currently shown threads. Use this when you won't know the total
	 * number of threads until you've reached the end of the list. If you already
	 * know the total number of threads in the list (not just the ones currently
	 * shown), omit this proeprty and use {total} instead.
	 * ^optional
	 * @type {Boolean}
	 */
	hasMore: null
};

/**
 * @class
 * An object used to describe a specific thread (e.g. when creating a custom
 * list via {Router.handleCustomListRoute()}). At least one property must
 * be present to identify a thread.
 */
var ThreadDescriptor = /** @lends ThreadDescriptor */{
	/**
	 * The value of a message's Message-ID header (which must start with "<" and end with ">").
	 * ^optional
	 * @type {String}
	 */
	rfcMessageId: null,

	/**
	 * The Gmail thread ID of a message.
	 * ^optional
	 * @type {String}
	 */
	gmailThreadId: null
};

/**
* All the different route types that exist in Gmail/Inbox
* @class
* @name NativeRouteIDs
*/
var nativeRouteIDs = Object.freeze(/** @lends NativeRouteIDs */ {
	/**
	* inbox list, Permissible Route Params: page (optional)
	* @type string
	*/
	'INBOX': 'inbox/:page',

	/**
	* all mail list, Permissible Route Params: page (optional)
	* @type string
	*/
	'ALL_MAIL': 'all/:page',

	/**
	* sent list, Permissible Route Params: page (optional)
	* @type string
	*/
	'SENT': 'sent/:page',

	/**
	* starred list, Permissible Route Params: page (optional)
	* @type string
	*/
	'STARRED': 'starred/:page',

	/**
	* drafts list, Permissible Route Params: page (optional)
	* @type string
	*/
	'DRAFTS': 'drafts/:page',

	/**
	* snoozed list (Inbox only)
	* @type string
	*/
	'SNOOZED': 'snoozed',

	/**
	* done list (Inbox only)
	* @type string
	*/
	'DONE': 'done',

	/**
	* reminders list (Inbox only)
	* @type string
	*/
	'REMINDERS': 'reminders',

	/**
	* any label list, Permissible Route Params: labelName, page (optional),
	* @type string
	*/
	'LABEL': 'label/:labelName/:page',

	/**
	* trash list, Permissible Route Params: page (optional)
	* @type string
	*/
	'TRASH': 'trash/:page',

	/**
	* spam list, Permissible Route Params: page (optional)
	* @type string
	*/
	'SPAM': 'spam/:page',

	/**
	* built in list of important emails, Permissible Route Params: page (optional)
	* @type string
	*/
	'IMPORTANT': 'imp/:page',

	/**
	* any search results page, Permissible Route Params: query, page (optional)
	* @type string
	*/
	'SEARCH': 'search/:query/:page',

	/**
	* single conversation view, Permissible Route Params: threadID
	* @type string
	*/
	'THREAD': 'inbox/:threadID',

	/**
	* list of chats, Permissible Route Params: page (optional)
	* @type string
	*/
	'CHATS': 'chats/:page',

	/**
	* single chat view, Permissible Route Params: chatID
	* @type string
	*/
	'CHAT': 'chats/:chatID',

	/**
	* google contacts view, Permissible Route Params: page (optional)
	* @type string
	*/
	'CONTACTS': 'contacts/:page',

	/**
	* single google contact view, Permissible Route Params: contactID
	* @type string
	*/
	'CONTACT': 'contacts/:contactID',

	/**
	* the settings view, Permissible Route Params: section
	* @type string
	*/
	'SETTINGS': 'settings/:section',

	/**
	* this refers to any of the above lists
	* @type string
	*/
	'ANY_LIST': '*'
});

/**
* The different list routes natively available in Gmail/Inbox. List routes display lists of threads or messages or other types.
* @class
* @name NativeListRouteIDs
*/
var nativeListRouteIDs = Object.freeze(/** @lends NativeListRouteIDs */ {
	/**
	* inbox list, Permissible Route Params: page (optional)
	* @type string
	*/
	'INBOX': nativeRouteIDs.INBOX,

	/**
	* all mail list, Permissible Route Params: page (optional)
	* @type string
	*/
	'ALL_MAIL': nativeRouteIDs.ALL_MAIL,

	/**
	* sent list, Permissible Route Params: page (optional)
	* @type string
	*/
	'SENT': nativeRouteIDs.SENT,

	/**
	* starred list, Permissible Route Params: page (optional)
	* @type string
	*/
	'STARRED': nativeRouteIDs.STARRED,

	/**
	* drafts list, Permissible Route Params: page (optional)
	* @type string
	*/
	'DRAFTS': nativeRouteIDs.DRAFTS,

	/**
	* snoozed list (Inbox only)
	* @type string
	*/
	'SNOOZED': nativeRouteIDs.SNOOZED,

	/**
	* done list (Inbox only)
	* @type string
	*/
	'DONE': nativeRouteIDs.DONE,

	/**
	* reminders list (Inbox only)
	* @type string
	*/
	'REMINDERS': nativeRouteIDs.REMINDERS,

	/**
	* any label list, Permissible Route Params: labelName, page (optional),
	* @type string
	*/
	'LABEL': nativeRouteIDs.LABEL,

	/**
	* trash list, Permissible Route Params: page (optional)
	* @type string
	*/
	'TRASH': nativeRouteIDs.TRASH,

	/**
	* spam list, Permissible Route Params: page (optional)
	* @type string
	*/
	'SPAM': nativeRouteIDs.SPAM,

	/**
	* built in list of important emails, Permissible Route Params: page (optional)
	* @type string
	*/
	'IMPORTANT': nativeRouteIDs.IMPORTANT,

	/**
	* any search results page, Permissible Route Params: query, page (optional)
	* @type string
	*/
	'SEARCH': nativeRouteIDs.SEARCH,

	/**
	* This refers to any of the above lists
	* @type string
	*/
	'ANY_LIST': nativeRouteIDs.ANY_LIST
});

/**
* The different route types that exist
* @class
* @name RouteTypes
*/
var routeTypes = Object.freeze(/** @lends RouteTypes */ {
	/**
	* a list of threads or messages
	* @type string
	*/
	'LIST': 'LIST',

	/**
	* a single thread or message
	* @type string
	*/
	'THREAD': 'THREAD',

	/**
	* a Gmail or Inbox settings
	* @type string
	*/
	'SETTINGS': 'SETTINGS',

	/**
	* a single chat history
	* @type string
	*/
	'CHAT': 'CHAT',

	/**
	* a custom route created by any app
	* @type string
	*/
	'CUSTOM': 'CUSTOM',

	/**
	* an unknown route
	* @type string
	*/
	'UNKNOWN': 'UNKNOWN'

});
