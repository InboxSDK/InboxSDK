/**
 * The different nav item types that exist
 * @class
 * @name  NavItemTypes
 */
let navItemTypes = {};
Object.defineProperties(navItemTypes, /** @lends NavItemTypes */ {

	/**
	 * standard nav item for navigating
	 */
	'NAVIGATION': {
		value: 'NAVIGATION',
		writable: false
	},

	/**
	 * nav item that looks like a link and appears at the bottom of the list
	 */
	'MANAGE': {
		value: 'MANAGE',
		writable: false
	}

});
Object.freeze(navItemTypes);


module.exports = navItemTypes;
