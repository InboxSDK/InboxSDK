var _ = require('lodash');
var NavItem = require('./nav-item');

var NavMenu = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;

	this._setupSentItem();
};

_.extend(NavMenu.prototype, {

	/**
	 * adds a nav item to the root of the nav menu. Gets placed underneath the top list of important Gmail labels
	 * @params {NavItemDescriptor} or stream of NavItemDescriptors
	 * @returns {NavItemView}
	 */
	addNavItem: function(navItemDescriptor){
		var navItem = new NavItem(this._platformImplementationLoader, navItemDescriptor);

		this._platformImplementationLoader.load().then(function(platformImplementation){

			var implementation = platformImplementation.NavMenu.addNavItem(navItemDescriptor);
			navItem.setImplementation(implementation);

		});

		return navItem;
	},

	_setupSentItem: function(){
		//this.SENT_ITEM = new NavItem(this._platformImplementationLoader, "SENT");
	}

	/**
	 * SENT_ITEM is a navItem that allows you to add NavItemViews to the native Sent Mail nav item.
	 */

});


module.exports = NavMenu;


var NavItemDescriptor = /** @lends NavItemDescriptor */ {

	/**
	 * Name of the link
	 * @type {string}
	 */
	name: null,

	/**
	 * optional. If you want an icon to the right of the name
	 * @type {string}
	 */
	iconUrl: null,

	/**
	 * optional. Another way to specify an icon to the right of the name
	 * @type {string}
	 */
	iconClass: null,

	/**
	 * optional. the name of the route to go to when clicked on
	 * @type {string}
	 */
	route: null,

	/**
	 * Array of parameters. combined with route, when the user clicks on the navItem it's like calling Router.goto(route, routeParams)
	 * @type {[{string}]}
	 */
	routeParams: null,


	/**
	 * optional. Used to specify ordering information
	 * @type {integer} defaults to Number.MAX_SAFE_INTEGER
	 */
	orderHint: null,

	/**
	 * if you want to add an interactive accessory to the nav item
	 * @type {AccessoryDescriptor}
	 */
	accessory: null

};


var CreateAccessoryDescriptor = /** @lends CreateAccessoryDescriptor */ {

	/**
	 * type must be set as 'CREATE'
	 * @type {string}
	 */
	type: 'CREATE',

	/**
	 * event to call when the create is clicked
	 * @type {function}
	 */
	onClick: null
};

var IconButtonAccessoryDescriptor = /** @lends IconButtonAccessoryDescriptor */ {

	/**
	 * type must be set as 'ICON_BUTTON'
	 * @type {string}
	 */
	type: 'ICON_BUTTON',

	/**
	 * optional. If you want an icon
	 * @type {string}
	 */
	iconUrl: null,

	/**
	 * optional. Another way to specify an icon
	 * @type {string}
	 */
	iconClass: null,

	/**
	 * event to call when the button is clicked
	 * @type {function}
	 */
	onClick: null
};


var DropdownButtonAccessoryDescriptor = /** @lends DropdownButtonAccessoryDescriptor */ {

	type: 'DROPDOWN_BUTTON',

	backgroundColor: null,

	foregroundColor: null,

	onClick: null

};

