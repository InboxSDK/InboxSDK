var _ = require('lodash');
var BasicClass = require('../lib/basic-class');
var makeMutationObserverStream = require('../lib/dom/make-mutation-observer-stream');
var convertForeignInputToBacon = require('../lib/convert-foreign-input-to-bacon');

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
		{name: '_modifiedNavItem', destroy: false}
	],

	addNavItem: function(navItemDescriptor){
		var navItemDescriptorPropertyStream = convertForeignInputToBacon(navItemDescriptor).toProperty();

		var navItemViewDriver = this._driver.addNavItem(this._appId, navItemDescriptorPropertyStream);
		var navItemView = new NavItemView(this._appId, this._driver, navItemViewDriver, navItemDescriptorPropertyStream);

		this._navItemViews.push(navItemView);

		return navItemView;
	},

	removeNativeNavItemActive: function(){
		if(this._modifiedNavItem){
			this._modifiedNavItem.destroy(); //make sure there is only one active at a time;
		}

		this._modifiedNavItem = this._driver.getCurrentActiveNavItem();

		if(!this._modifiedNavItem){
			return;
		}


		this._modifiedNavItem.setActive(false);

		var modifiedNavItem;
		var self = this;
		makeMutationObserverStream(this._modifiedNavItem.getElement().parentElement, {childList: true})
			.takeWhile(function(){
				return modifiedNavItem === self._modifiedNavItem;
			})
			.flatMap(function(mutations){
				return Bacon.fromArray(mutations);
			})
			.flatMap(function(mutation){
				return Bacon.fromArray(_.toArray(mutation.removedNodes));
			})
			.filter(function(removedNode){
				return removedNode === modifiedNavItem.getElement();
			})
			.onValue(this, 'removeNativeNavItemActive'); //reset ourselves
	},

	restoreNativeNavItemActive: function(){
		if(!this._modifiedNavItem){
			return;
		}

		this._modifiedNavItem.setActive(true);
		this._modifiedNavItem.destroy();
		this._modifiedNavItem = null;
	},

	unhandleNativeNavItem: function(){
		if(this._modifiedNavItem){
			this._modifiedNavItem.destroy();
			this._modifiedNavItem = null;
		}
	}

});

module.exports = NavMenu;
