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

	// nav item for logical grouping. In Gmailv2, the entire nav item can be clicked to expand/collapse its children and it ignores all NavItemDescriptor options other than `name` and `subtitle`.
	// Behaves identically to NAVIGATION when in Gmailv1.
	'GROUPER': 'GROUPER',

	// Old alias for LINK
	'MANAGE': 'MANAGE'
});

module.exports = navItemTypes;
