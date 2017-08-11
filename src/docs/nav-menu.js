/**
* @class
* This namespace contains functionality associated with adding navigation items to the navigation menu of Gmail and Inbox.
* Typically, these navigation links are accessible by the user on the left side of the email client and include built in
* navigation items like the Inbox, Sent Mail or Drafts links.
*
* This namespace allows you to add your own items to this Navigation menu. Typically, these navigation items are useful
* to send users to different Routes that you have already registered providing navigation for your entire application.
*
* The navigation menu is represented as a tree structure of items. Each item can have 0 or more children and there are
* several options to configure the appearance of the items.
*
* Items can also have accessories which provide secondary actions like opening a dropdown (like Gmails labels) or
* providing a "create new" action. There are several predefined accesories, see {CreateAccessoryDescriptor},
* {IconButtonAccessoryDescriptor} or {DropdownButtonAccessoryDescriptor}.
*
* In Inbox, adding children to a 'root' level {NavItemView} (i.e. an item which
* is not a child of another item) causes the parent to become a 'section header'.
* Section headers are styled to resemble the labels for Inbox's native sections
* like "Bundled in the inbox", and add a horizontal dividing line above themselves.
* When a {NavItemView} becomes a section header, it is no longer interactive
* and does not navigate to its routeID or trigger an onClick handler.
* Using section headers can be useful for breaking up your app's navigation
* into categories or groups.
*/
var NavMenu = /** @lends NavMenu */{

	/**
	* Adds a navigation item to the root of the navigation menu. Navigation items from your app are grouped together
	* where possible but ultimately the SDK optimizes for the best user experience when displaying navigation items.
	* ^gmail
	* ^inbox
	* @param {NavItemDescriptor} navItemDescriptor - A single descriptor for the nav item or stream of NavItemDescriptors.
	* @return {NavItemView}
	*/
	addNavItem: function(){},

	SENT_MAIL: null

};

/**
* @class
* This object represents the set of options to configure a new {NavItemView}.
*/
var NavItemDescriptor = /** @lends NavItemDescriptor */ {

	/**
	* Name of the NavItem to be used for display
	* @type {string}
	*/
	name: null,

	/**
	* The ID of the route to navigate to when the NavItemView is clicked on.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	routeID: null,

	/**
	* The parameters of the route being navigated to when the NavItemView is clicked on.
	* ^optional
	* ^default=null
	* @type {Object}
	*/
	routeParams: null,

	/**
	* A function that will be called when the NavItemView is clicked.
	* Passed a single event object parameter which includes a preventDefault()
	* function. If the NavItemView has a routeID, calling preventDefault() will
	* prevent navigation to the given route.
	* ^optional
	* ^default=null
	* @type {function(event)}
	*/
	onClick: null,

	/**
	* Used to specify the order in which your NavItemViews should be relative to each other
	* ^optional
	* ^default=Number.MAX_SAFE_INTEGER
	* @type {integer}
	*/
	orderHint: null,

	/**
	* There are several "accessories" which can provide secondary actions for {NavItemView}s
	* ^optional
	* ^default=null
	* @type {CreateAccessoryDescriptor|IconButtonAccessoryDescriptor|DropdownButtonAccessoryDescriptor}
	*/
	accessory: null,

	/**
	* An optional url to an icon to display an icon alongside the name of the {NavItemView}
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconUrl: null,

	/**
	* An optional class to apply to the icon.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconClass: null,

	/**
	* In Inbox, providing a {backgroundColor} will add a colored circle indicator
	* on the left of a {NavItemView}, provided that it is either a root NavItem with
	* no children or a {NavItemView} 1 level deep.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	backgroundColor: null,

	/**
	* In Inbox, {expanderForegroundColor} controls the color of the expand/collapse
	* arrow for {NavItemView}s with children that are 1 level deep.
	* This arrow will appear on top of the colored circle defined by {backgroundColor},
	* and should be complimentary if {backgroundColor} and {expanderForegroundColor}
	* are both provided.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	expanderForegroundColor: null,

	/**
	* The nav item type affects how the item is displayed.
	* ^optional
	* ^default=NAVIGATION
	* @type {NavItemTypes}
	*/
	type: null
};

/**
* @class
* The CreateAccessoryDescriptor allows you to add an action to allow the user to create a new child of this item.
*/
var CreateAccessoryDescriptor = /** @lends CreateAccessoryDescriptor */ {

	/**
	* For CreateAccessoryDescriptors this should always be set to {CREATE}
	* @type {string}
	*/
	type: 'CREATE',

	/**
	* Callback for when the "Create New" accessory is pressed.
	* @type {function}
	*/
	onClick: null
};


/**
* @class
* The IconButtonAccessoryDescriptor allows you to add an icon button right next your {NavItem} which lets the user take a secondary action
*/
var IconButtonAccessoryDescriptor = /** @lends IconButtonAccessoryDescriptor */ {

	/**
	* For IconButtonAccessoryDescriptors this should always be set to {ICON_BUTTON}
	* @type {string}
	*/
	type: 'ICON_BUTTON',

	/**
	* Callback for when the IconButton accessory is pressed.
	* @type {function}
	*/
	onClick: null,

	/**
		* A URL for the icon to be displayed in the button.
		* @type {string}
	*/
	iconUrl: null,

	/**
	* An optional class to add to the icon.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconClass: null
};


/**
* @class
* The DropdownButtonAccessoryDescriptor allows you to add a dropdown right next your {NavItemView}
*/
var DropdownButtonAccessoryDescriptor = /** @lends DropdownButtonAccessoryDescriptor */ {

	/**
	* For DropdownButtonAccessoryDescriptors this should always be set to {DROPDOWN_BUTTON}
	* @type {string}
	*/
	type: 'DROPDOWN_BUTTON',

	/**
	* The color of the background of the dropdown button. Ignored in Inbox.
	* @type {string}
	*/
	buttonBackgroundColor: null,

	/**
	* The color of the foreground of the dropdown button. Ignored in Inbox.
	* @type {string}
	*/
	buttonForegroundColor: null,

	/**
	* A callback when the dropdown button is pressed. The event object passed to you has a
	* dropdown property which you can fill your content with.
	* @type {func(event)}
	*/
	onClick: null
};
