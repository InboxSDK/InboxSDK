'use strict';

var _ = require('lodash');
var Map = require('es6-unweak-collections').Map;
var Bacon = require('baconjs');
var baconCast = require('bacon-cast');

var NavItemView = require('../views/nav-item-view');
var NativeNavItemView = require('../views/native-nav-item-view');

var memberMap = new Map();

var NavMenu = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;
	members.navItemViews = [];

	this.SENT_MAIL = _setupSentMail(appId, driver);
};

_.extend(NavMenu.prototype, {

	addNavItem: function(navItemDescriptor){
		var members = memberMap.get(this);
		var navItemDescriptorPropertyStream = baconCast(Bacon, navItemDescriptor).toProperty();

		var navItemView = new NavItemView(members.appId, members.driver, navItemDescriptorPropertyStream);

		var navItemViewDriver = members.driver.addNavItem(members.appId, navItemDescriptorPropertyStream);
		navItemView.setNavItemViewDriver(navItemViewDriver);

		members.navItemViews.push(navItemView);
		return navItemView;
	},

	SENT_MAIL: null

});

function _setupSentMail(appId, driver){
	var nativeNavItemView = new NativeNavItemView(appId, driver);

	driver.getSentMailNativeNavItem().then(function(sentMailNavItemViewDriver){
		nativeNavItemView.setNavItemViewDriver(sentMailNavItemViewDriver);
	});

	return nativeNavItemView;
}

module.exports = NavMenu;
