/**
 * The different nav item types that exist
 * @class
 * @name  NavItemTypes
 */
var navItemTypes = Object.freeze(/** @lends NavItemTypes */ {
	/**
	 * standard nav item for navigating
	 */
	'NAVIGATION': 'NAVIGATION',

	/**
	 * nav item that looks like a link
	 */
	'LINK': 'LINK',

	// Old alias for LINK
	'MANAGE': 'MANAGE'
});

module.exports = navItemTypes;
