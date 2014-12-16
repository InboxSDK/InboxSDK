var _ = require('lodash');
var NavItem = require('./nav-item');

var NavMenu = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;

	this._setupSentItem();
};

_.extend(NavMenu.prototype, {

	addNavItem: function(navItemDescriptor){
		var navItem = new NavItem(this._platformImplementationLoader, navItemDescriptor);

		this._platformImplementationLoader.load().then(function(platformImplementation){

			var implementation = platformImplementation.NavMenu.addNavItem(navItemDescriptor);
			navItem.setImplementation(implementation);

		});

		return navItem;
	},

	_setupSentItem: function(){
		this.SENT_ITEM = new NavItem(this._platformImplementationLoader, null, "SENT");
	}

});


module.exports = NavMenu;
