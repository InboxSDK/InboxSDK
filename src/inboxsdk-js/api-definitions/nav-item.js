var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var RSVP = require('rsvp');


/**
 * NavItemView this lets you interact with a nav item on the left menu
 */
var NavItem = function(platformImplementation){
	EventEmitter.call(this);

	this._platformImplementation = platformImplementation;

	this._removed = false;

	this._implementation = null;
	this._subItems = [];
};

NavItem.prototype = Object.create(EventEmitter.prototype);

_.extend(NavItem.prototype, {

	/**
	 * Add a child nav item
	 * @param {NavItemDescriptor}
	 * @returns {NavItemView}
	 */
	addNavItem: function(navItemDescriptor){
		if(this._removed){
			console.warn('This nav item is removed so nothing will happen');
			return new NavItem(this._platformImplementation);
		}

		var navItem = new NavItem(this._platformImplementation);

		var implementation = this._implementation.addNavItem(navItemDescriptor);
		navItem.setImplementation(implementation);

		this._subItems.push(navItem);

		return navItem;
	},

	/**
	 * remove the nav item
	 */
	remove: function(){
		this._subItems.forEach(function(subItem){
			subItem.remove();
		});

		this._implementation.remove();
		this._removed = true;
	},

	/**
	 * Tells if the nav item is in a collapsed state or not
	 * @returns {Boolean}
	 */
	isCollapsed: function(){
		if(this._removed){
			console.warn('This nav item is removed');
			return null;
		}

		return this._implementation.isCollapsed();
	},

	/**
	 * Set the collapsed state
	 * @param {boolean}
	 */
	setCollapsed: function(collapseValue){
		this._implementation.setCollapsed(collapseValue);
	},

	/* internal */
	setImplementation: function(implementation){
		this._implementation = implementation;
		this._bindToImplementationEvents();
	},

	_bindToImplementationEvents: function(){
		this._implementation.getEventStream().onEnd(this, 'emit', 'destroy');

		var self = this;
		this._implementation.getEventStream().onValue(function(event){
			self.emit(event.eventName, event.data);
		});
	}

});

module.exports = NavItem;
