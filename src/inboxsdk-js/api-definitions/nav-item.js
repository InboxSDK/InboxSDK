var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var RSVP = require('rsvp');

var NavItem = function(platformImplementationLoader){
	EventEmitter.call(this);

	this._platformImplementationLoader = platformImplementationLoader;

	this._removedEarly = false;
	this._removed = false;

	this._implementation = null;
	this._deferred = RSVP.defer();
	this._subItems = [];
};

NavItem.prototype = Object.create(EventEmitter.prototype);

_.extend(NavItem.prototype, {

	setImplementation: function(implementation){
		if(this._removedEarly){
			implementation.remove();
			return;
		}

		this._implementation = implementation;
		this._bindToImplementationEvents();

		this._deferred.resolve();
	},

	addNavItem: function(navItemDescriptor){
		if(this._removed){
			console.warn('This nav item is removed so nothing will happen');
			return new NavItem(navItemDescriptor);
		}

		var navItem = new NavItem(navItemDescriptor);

		var self = this;
		this._deferred.promise.then(function(){
			var implementation = self._implementation.addNavItem(navItemDescriptor);
			navItem.setImplementation(implementation);
		});

		this._subItems.push(navItem);

		return navItem;
	},

	remove: function(){
		this._subItems.forEach(function(subItem){
			subItem.remove();
		});

		if(self._implementation){
			self._implementation.remove();
		}
		else{
			this._removedEarly = true;
		}

		this._removed = true;

		this._deferred.reject();
	},

	isCollapsed: function(){
		if(this._removed){
			console.warn('This nav item is removed');
			return null;
		}

		if(!this._implementation){
			console.warn('NavItem is not yet loaded, so collapse state is unknown');
			return null;
		}

		return this._implementation.isCollapsed();
	},

	setCollapsed: function(collapseValue){
		var self = this;
		this._deferred.promise.then(function(){
			self._implementation.setCollapsed(collapseValue);
		});
	},

	_bindToImplementationEvents: function(){
		this._implementation.getEventStream().onEnd(this, 'emit', 'unload');

		var self = this;
		this._implementation.getEventStream().onValue(function(event){
			self.emit(event.eventName, event.data);
		});
	}

});

module.exports = NavItem;
