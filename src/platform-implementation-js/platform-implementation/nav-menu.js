var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var NavItemView = require('../views/nav-item-view');

var NavMenu = function(appId, driver){
	BasicClass.call(this);

	this._appId = appId;
	this._driver = driver;
};

NavMenu.prototype = Object.create(BasicClass.prototype);

_.extend(NavMenu.prototype, {

	__memberVariables:[
		{name: '_appId', destroy: false},
		{name: '_driver', destroy: false},
		{name: '_navItemViews', destroy: true, defaultValue: []},
	],

	addNavItem: function(navItemDescriptor){
		var navItemViewDriver = this._driver.addNavItem(this._appId, navItemDescriptor);
		var navItemView = new NavItemView(this._appId, this._driver, navItemViewDriver);

		this._navItemViews.push(navItemView);

		return navItemView;
	}

});

module.exports = NavMenu;
