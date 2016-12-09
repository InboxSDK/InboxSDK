/* @flow */

/**
 * The different nav item types that exist
 * @class
 * @name  NavItemTypes
 */
const navItemTypes = Object.freeze(/** @lends NavItemTypes */ {
	/**
	 * standard nav item for navigating
	 * @type {string}
	 */
	'NAVIGATION': 'NAVIGATION',

	/**
	 * nav item that looks like a link
	 * @type {string}
	 */
	'LINK': 'LINK',

	// Old alias for LINK
	'MANAGE': 'MANAGE'
});

module.exports = navItemTypes;
