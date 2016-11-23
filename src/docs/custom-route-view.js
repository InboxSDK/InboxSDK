/**
* @class
* CustomRouteViews represent your own custom pages of content.
* @extends RouteView
*/
var CustomRouteView = /** @lends CustomRouteView */{

	/**
	* Gets the element representing the content area of this CustomRouteView. You
	* should inject your content into this element.
	* @return {HTMLElement} the main element of your custom route
	*/
	getElement: function(){},

	/**
	* (Inbox-only) Set whether the custom view should expand its width as wide as
	* possible on the page, or to leave the same margins on the left and ride
	* sides Inbox's thread list does. The default behavior is to have `fullWidth`
	* mode be true.
	* @param {boolean} fullWidth - If true, then the custom view will be as wide
	* as possible without leaving margins.
	*/
	setFullWidth: function(fullWidth) {}

};
