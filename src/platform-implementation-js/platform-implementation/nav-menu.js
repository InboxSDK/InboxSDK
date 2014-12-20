'use strict';

var _ = require('lodash');
var Map = require('es6-unweak-collections').Map;
var convertForeignInputToBacon = require('../lib/convert-foreign-input-to-bacon');

var NavItemView = require('../views/nav-item-view');

var memberMap = new Map();

var NavMenu = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
	members.navItemViews = [];
};

_.extend(NavMenu.prototype, {

	addNavItem: function(navItemDescriptor){
		var members = memberMap.get(this);
		var navItemDescriptorPropertyStream = convertForeignInputToBacon(navItemDescriptor).toProperty();

		var navItemViewDriver = members.driver.addNavItem(members.appId, navItemDescriptorPropertyStream);
		var navItemView = new NavItemView(members.appId, members.driver, navItemViewDriver, navItemDescriptorPropertyStream);

		members.navItemViews.push(navItemView);

		return navItemView;
	}

});

module.exports = NavMenu;
