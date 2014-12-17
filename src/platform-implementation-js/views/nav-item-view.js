var _ = require('lodash');
var BasicClass = require('../lib/basic-class');
var Bacon = require('baconjs');

var NavItemView = function(appId, driver, navItemViewDriver, navItemDescriptor){
	BasicClass.call(this);

	this._appId = appId;
	this._driver = driver;
	this._navItemViewDriver = navItemViewDriver;
	this._eventStream = new Bacon.Bus();

	if(navItemDescriptor.onValue){
		var self = this;
		navItemDescriptor.onValue(function(streamNavItemDescriptor){
			self._navItemDescriptor = streamNavItemDescriptor;
		});
	}
	else{
		this._navItemDescriptor = navItemDescriptor;
	}

	this._navItemViewDriver.getEventStream().onValue(this, '_handleStreamEvent');
	this._driver.getRouteViewDriverStream().onValue(this, '_handleRouteViewChange');
};

NavItemView.prototype = Object.create(BasicClass.prototype);

_.extend(NavItemView.prototype, {

	__memberVariables:[
		{name: '_appId', destroy: false},
		{name: '_driver', destroy: false},
		{name: '_navItemViewDriver', destroy: true},
		{name: '_navItemDescriptor', destroy: false},
		{name: '_navItemViews', destroy: true, defaultValue: []},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'}
	],

	addNavItem: function(navItemDescriptor){
		var navItemViewDriver = this._navItemViewDriver.addNavItem(this._appId, navItemDescriptor);
		var navItemView = new NavItemView(this._appId, this._driver, navItemViewDriver, navItemDescriptor);

		this._navItemViews.push(navItemView);

		return navItemView;
	},

	remove: function(){
		this._navItemViewDriver.remove();
		this.destroy();
	},

	isCollapsed: function(){
		return this._navItemViewDriver.isCollapsed();
	},

	setCollapsed: function(collapseValue){
		this._navItemViewDriver.setCollapsed(collapseValue);
	},

	_handleStreamEvent: function(event){
		switch(event.eventName){
			case 'mouseenter':

				if(this._navItemDescriptor.route){
					this._navItemViewDriver.setHighlight(true);
				}

			break;
			case 'mouseleave':

				this._navItemViewDriver.setHighlight(false);

			break;
			case 'click':

				if(this._navItemDescriptor.route){
					this._driver.gotoView(this._navItemDescriptor.route, this._navItemDescriptor.routeParams);
				}
				else{
					this._navItemViewDriver.toggleCollapse();
				}

			break;
			case 'expanded':
			case 'collapsed':
				this._eventStream.push(event);
			break;
		}
	},

	_handleRouteViewChange: function(routeViewDriver){
		this._navItemViewDriver.setActive(
			this._navItemDescriptor &&
			this._navItemDescriptor.route === routeViewDriver.getName() &&
			_.isEqual(this._navItemDescriptor.routeParams, routeViewDriver.getParams())
		);
	}

});

module.exports = NavItemView;
