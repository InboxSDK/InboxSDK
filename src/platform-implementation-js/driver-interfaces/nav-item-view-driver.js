/* eslint-disable flowtype/require-valid-file-annotation */

import BasicClass from '../lib/basic-class';

export default function NavItemViewDriver() {
	BasicClass.call(this);
}

NavItemViewDriver.prototype = Object.create(BasicClass.prototype);

Object.assign(NavItemViewDriver.prototype, {

	addNavItem: null,

	remove: null,

	isCollapsed: null,

	setCollapsed: null,

	setHighlight: null,

	setActive: null

});
