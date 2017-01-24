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
	* ^gmail
	* ^inbox
	* @param {string} routeID - A route specifying where the link should navigate the user to.
	* @param {Object} params - an object containing the parameters that will be encoded in the link and decoded when the user
	* subsequently visits the route. Handlers for the specified routeID will receive a copy of this object. This object must contain
	* only simple key value pairs with no nested arrays/objects.
	* @return {string} the encoded URL
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
	* {CustomRouteView} which you can modify the content.
	* ^gmail
	* ^inbox
	* @param {string} routeID - which route this handler is registering for
	* @param {func(CustomRouteView)} handler - The callback to call when the route changes to a custom route matching
	* the provided routeID
	* @return {function} a function which can be called to to stop handling these routes
	*/
	handleCustomRoute: function(){},

	/**
	* Registers a handler (callback) to be called when the user navigates to any route (both customs and built in routes).
	* Because this can apply to any route, your callback will be given only a generic {RouteView}. This is typically used
	* when you want to monitor for page changes but don't necessarily need to modify the page.
	* ^gmail
	* @param {func(RouteView)} handler - The callback to call when the route changes
	* @return {function} a function which can be called to to stop handling these routes
	*/
	handleAllRoutes: function(){},

	/**
	* Registers a handler (callback) to be called when the user navigates to a list route which matches the routeID you provide.
	* Gmail and Inbox have several built in routes which are "Lists". These include routes like Inbox, All Mail, Sent, Drafts, etc.
	* You'll typically use this modify Gmail's and Inbox's built in List routes.
	* ^gmail
	* @example
InboxSDK.load('1', 'MY_APP_ID').then(function(sdk) {
	sdk.Router.handleListRoute(Router.NativeListRouteIDs.SEARCH, function(inboxView) {
		console.log(inboxView);
	})
});
	* @param {NativeListRouteIDs} routeID - which list route this handler is registering for.
	* @param {func(ListRouteView)} handler - The callback to call when the route changes to a list route matching the routeId.
	* @return {function} a function which can be called to stop handling these routes
	*/
	handleListRoute: function(){},

	/**
	* Used to create a custom view that shows a list of threads. When the user navigates
	* to the given routeID, the handler function will be called. The handler function
	* will be passed the starting offset (if the user sees 50 threads per page and is on
	* page 2, then the offset will be 50) and it should return an array of up to 50 thread IDs
	* or a Promise for an array of thread IDs.
	* The thread IDs should each be a string that is a Gmail Thread ID or the value of
	* a message's Message-ID header (which must start with "<" and end with ">"), or for more
	* efficiency both of them can be supplied together in an object with "gmailThreadId" and
	* "rfcMessageId" properties.
	* ^gmail
	* @param {string} routeID - which route this handler is registering for
	* @param {function(offset)} handler - passed a page offset at must return an array (or Promise for an array) of thread ids.
	* @return {function} a function which can be called to stop handling these routes
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
