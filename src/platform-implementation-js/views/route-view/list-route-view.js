'use strict';

var _ = require('lodash');
var RouteView = require('./route-view');

var Map = require('es6-unweak-collections').Map;

var Bacon = require('baconjs');
var baconCast = require('bacon-cast');

var CollapsibleSectionView = require('../collapsible-section-view');

var membersMap = new Map();



/**
* @class
* @extends RouteView
* ListRouteViews represent pages within Gmail or Inbox that show a list of emails. Typical examples are the Inbox, Sent Mail,
* Drafts, etc. However, views like the Conversation view or Settings would *not* be a ListRouteView.
*/

var ListRouteView = function(routeViewDriver, driver){
	RouteView.call(this, routeViewDriver);

	var members = {};
	membersMap.set(this, members);

	members.sectionViews = [];
	members.routeViewDriver = routeViewDriver;
	members.driver = driver;
};

ListRouteView.prototype = Object.create(RouteView.prototype);

_.extend(ListRouteView.prototype, /** @lends ListRouteView */ {

	/**
	 * Adds a collapsible section to the top of the page.
	 * @param {CollapsibleSectionDescriptor} configuration options of the CollapsibleSectionView
	 * @returns {CollapsibleSectionView} the CollapsibleSectionView that was added
	 */
	addCollapsibleSection: function(collapsibleSectionDescriptor){
		var members = membersMap.get(this);

		var collapsibleSectionViewDriver = members.routeViewDriver.addCollapsibleSection(baconCast(Bacon, collapsibleSectionDescriptor).toProperty(), members.appId);
		var collapsibleSectionView = new CollapsibleSectionView(collapsibleSectionViewDriver, members.driver);

		members.sectionViews.push(collapsibleSectionView);
		return collapsibleSectionView;
	},

	/* TODO NOT PUBLIC, get it outta here */
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
