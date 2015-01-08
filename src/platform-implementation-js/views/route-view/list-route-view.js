'use strict';

var _ = require('lodash');
var RouteView = require('./route-view');

var Map = require('es6-unweak-collections').Map;

var Bacon = require('baconjs');
var baconCast = require('bacon-cast');

var CollapsibleSectionView = require('../collapsible-section-view');

var membersMap = new Map();

var ListRouteView = function(routeViewDriver, driver){
	RouteView.call(this, routeViewDriver);

	var members = {};
	membersMap.set(this, members);

	members.sectionViews = [];
	members.routeViewDriver = routeViewDriver;
	members.driver = driver;
};

ListRouteView.prototype = Object.create(RouteView.prototype);

_.extend(ListRouteView.prototype, {

	/**
	 * Adds a collapsible section to the page. On create "loading" is shown in the section by default.
	 * You can then set the content by calling actual results by calling setResults on the returned {CollapsibleSectionView} object.
	 * @param {CollapsibleSectionDescriptor}
	 * @returns {CollapsibleSectionView}
	 */
	addCollapsibleSection: function(collapsibleSectionDescriptor){
		var members = membersMap.get(this);

		var collapsibleSectionViewDriver = members.routeViewDriver.addCollapsibleSection(baconCast(Bacon, collapsibleSectionDescriptor).toProperty(), members.appId);
		var collapsibleSectionView = new CollapsibleSectionView(collapsibleSectionViewDriver, members.driver);

		members.sectionViews.push(collapsibleSectionView);
		return collapsibleSectionView;
	},

	destroy: function(){
		if(!membersMap.has(this)){
			return;
		}

		var members = membersMap.get(this);

		members.sectionViews.forEach(function(sectionView){
			sectionView.destroy();
		});

		membersMap.delete(this);

		RouteView.prototype.destroy.call(this);
	}

});

module.exports = ListRouteView;
