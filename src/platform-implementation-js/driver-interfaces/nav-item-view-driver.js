var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var NavItemViewDriver = function(){
	BasicClass.call(this);
};

NavItemViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(NavItemViewDriver.prototype, {

	addNavItem: null,

	remove: null,

	isCollapsed: null,

	setCollapsed: null,

	setHighlight: null,

	setActive: null

});


module.exports = NavItemViewDriver;
