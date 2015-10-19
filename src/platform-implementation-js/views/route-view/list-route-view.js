'use strict';

var _ = require('lodash');
var util = require('util');
var RouteView = require('./route-view');

var Bacon = require('baconjs');
var baconCast = require('bacon-cast');

var CollapsibleSectionView = require('../collapsible-section-view');
var SectionView = require('../section-view');

var membersMap = new WeakMap();

// documented in src/docs/
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

_.extend(ListRouteView.prototype, {

	addCollapsibleSection(collapsibleSectionDescriptor){
		var members = membersMap.get(this);

		var collapsibleSectionViewDriver = members.routeViewDriver.addCollapsibleSection(baconCast(Bacon, collapsibleSectionDescriptor).toProperty(), members.appId);
		var collapsibleSectionView = new CollapsibleSectionView(collapsibleSectionViewDriver, members.driver);

		members.sectionViews.push(collapsibleSectionView);
		return collapsibleSectionView;
	},

	addSection(sectionDescriptor){
		var members = membersMap.get(this);

		var sectionViewDriver = members.routeViewDriver.addSection(baconCast(Bacon, sectionDescriptor).toProperty(), members.appId);
		var sectionView = new SectionView(sectionViewDriver, members.driver);

		members.sectionViews.push(sectionView);
		return sectionView;
	},

	refresh() {
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
