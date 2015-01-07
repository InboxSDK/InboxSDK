'use strict';

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var RSVP = require('rsvp');
var Map = require('es6-unweak-collections').Map;

var baconCast = require('bacon-cast');

var ResultsSectionView = require('./results-section-view');


var membersMap = new Map();

/**
 * @class
 * RouteViews are created when the user navigates to a specific url or page. RouteViews can be "custom", those
 * that the application developer registers, or they can be "builtin" which are those that the email client natively
 * supports like "Sent", "Drafts", or "Inbox"
 *
 * When using custom RouteViews, you'll typicall register a RouteView on the Router class and then be given a RouterView
 * when the user navigates to it. You'll typically add your own custom content to the RouteView by using the
 * <code>getElement</code> function.
 *
 * When navigating to RouteViews, parameters can be supplied (see <code>Router.goto</code>) which can later be fetched using <code>getParams</code>.
 */
var RouteView = function(routeViewDriver, driver){
	EventEmitter.call(this);

	var members = {};
	membersMap.set(this, members);

	members.routeViewDriver = routeViewDriver;
	members.driver = driver;
	members.sectionViews = [];

	_bindToEventStream(routeViewDriver, this);
};

RouteView.prototype = Object.create(EventEmitter.prototype);

_.extend(RouteView.prototype, /** @lends RouteView */{

	/**
	 * Adds a collapsible results section to the result page. If no results are specified then "loading" is shown in the section by default.
	 * You can then set the actual results by calling setResults on the returned {ResultsSectionView} object.
	 * @param {CollapsibleSectionDescriptor}
	 * @returns {CollapsibleSectionView}
	 */
	addCollapsibleSection: function(collapsibleSectionDescriptor){
		var members = membersMap.get(this);

		var resultsSectionViewDriver = members.routeViewDriver.addCollapsibleSection(baconCast(collapsibleSectionDescriptor).toProperty(), members.appId);
		var resultsSectionView = new ResultsSectionView(resultsSectionViewDriver, members.driver);

		members.sectionViews.push(resultsSectionView);
		return resultsSectionView;
	},

	/**
	 * Get the name of the RouteView. If this is a custom route then this is the name you registered the route with.
	 * @return {string}
	 */
	getRouteID: function(){
		var members = membersMap.get(this);

		if(!members.routeID){
			members.routeID = members.routeViewDriver.getRouteID();
		}

		return members.routeID;
	},

	getRouteType: function(){
		var members = membersMap.get(this);

		if(!members.routeType){
			members.routeType = members.routeViewDriver.getRouteType();
		}

		return members.routeType;
	},

	/**
	 * Get the URL parameters of this RouteView instance
	 * @return {stringp[]}
	 */
	getParams: function(){
		var members = membersMap.get(this);

		if(!members.params){
			members.params = members.routeViewDriver.getParams(members.routeID);
		}

		return members.params;
	},

	/**
	 * Indicates whether this RouteView is a custom route, or native to the web client
	 * @return {Boolean}
	 */
	isCustomRoute: function(){
		return membersMap.get(this).routeViewDriver.isCustomRoute();
	},

	/**
	* Gets the element representing the content area of this RouteView
	* @return {HTMLElement}
	*/
	getElement: function(){
		return membersMap.get(this).routeViewDriver.getCustomViewElement();
	},

	setRouteID: function(routeID){
		membersMap.get(this).routeID = routeID;
	},

	destroy: function(){
		if(!membersMap.has(this)){
			return;
		}

		var members = membersMap.get(this);

		members.routeViewDriver.destroy();
		members.sectionViews.forEach(function(sectionView){
			sectionView.destroy();
		});

		this.removeAllListeners();
		membersMap.delete(this);
	}

	/**
	* Fires when this RouteView instance is navigated away from
	* @event RouteView#unload
	*/

});


function _bindToEventStream(routeViewDriver, routeView){
	routeViewDriver.getEventStream().onEnd(routeView, 'emit', 'unload');
}

module.exports = RouteView;
