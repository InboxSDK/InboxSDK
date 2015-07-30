'use strict';

var _ = require('lodash');
var util = require('util');
var RouteView = require('./route-view');

var Bacon = require('baconjs');
var baconCast = require('bacon-cast');

var CollapsibleSectionView = require('../collapsible-section-view');
var SectionView = require('../section-view');

var membersMap = new WeakMap();

/**
* @class
* ListRouteViews represent pages within Gmail or Inbox that show a list of emails. Typical examples are the Inbox, Sent Mail,
* Drafts, etc. However, views like the Conversation view or Settings would *not* be a ListRouteView.
* @extends RouteView
*/
function ListRouteView(routeViewDriver, driver, appId){
	RouteView.call(this, routeViewDriver);

	var members = {};
	membersMap.set(this, members);

	members.sectionViews = [];
	members.routeViewDriver = routeViewDriver;
	members.driver = driver;
	members.appId = appId;

	_bindToEventStream(routeViewDriver, this);
}

util.inherits(ListRouteView, RouteView);

_.extend(ListRouteView.prototype, /** @lends ListRouteView */ {

	/**
	 * Adds a collapsible section to the top of the page.
	 * @param {SectionDescriptor|Stream.<SectionDescriptor>} options - configuration options of the CollapsibleSectionView
	 * @returns {CollapsibleSectionView} the CollapsibleSectionView that was added
	 */
	addCollapsibleSection: function(collapsibleSectionDescriptor){
		var members = membersMap.get(this);

		var collapsibleSectionViewDriver = members.routeViewDriver.addCollapsibleSection(baconCast(Bacon, collapsibleSectionDescriptor).toProperty(), members.appId);
		var collapsibleSectionView = new CollapsibleSectionView(collapsibleSectionViewDriver, members.driver);

		members.sectionViews.push(collapsibleSectionView);
		return collapsibleSectionView;
	},

	/**
	 * Adds a non-collapsible section to the top of the page.
	 * @param {SectionDescriptor|Stream.<SectionDescriptor>} options - configuration options of the SectionView
	 * @returns {SectionView} the SectionView that was added
	 */
	addSection: function(sectionDescriptor){
		var members = membersMap.get(this);

		var sectionViewDriver = members.routeViewDriver.addSection(baconCast(Bacon, sectionDescriptor).toProperty(), members.appId);
		var sectionView = new SectionView(sectionViewDriver, members.driver);

		members.sectionViews.push(sectionView);
		return sectionView;
	},

	/**
	 * Simulates a click on the Gmail thread list refresh button.
	 */
	refresh: function() {
		membersMap.get(this).routeViewDriver.refresh();
	}

});

function _bindToEventStream(routeViewDriver, routeView){
	routeViewDriver.getEventStream().onEnd(function(){
		var members = membersMap.get(routeView);

		members.sectionViews.forEach(function(sectionView){
			sectionView.destroy();
		});
	});
}

module.exports = ListRouteView;
