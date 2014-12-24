var _ = require('lodash');
var RSVP = require('rsvp');

var ResultsSectionView = require('./results-section-view');

var EventEmitter = require('events').EventEmitter;

var Map = require('es6-unweak-collections').Map;
var membersMap = new Map();


/**
 * This class represents a search results page
 */
var SearchResultsView = function(searchTerm, router){
	EventEmitter.call(this);

	var members = {};
	membersMap.set(this, members);

	members.router = router;
	members.searchTerm = searchTerm;
	members.deferred = RSVP.defer();
	members.sectionViews = [];
};

SearchResultsView.prototype = Object.create(EventEmitter.prototype);

_.extend(SearchResultsView.prototype, {

	/**
	 * Adds a collapsible results section to the result page. If no results are specified then "loading" is shown in the section by default.
	 * You can then set the actual results by calling setResults on the returned {ResultsSectionView} object.
	 * @param {ResultsSectionDescriptor}
	 * @returns {ResultsSectionView}
	 */
	addResultsSection: function(resultsSectionDescriptor){
		var members = membersMap.get(this);
		var resultsSectionView = new ResultsSectionView(members.router);

		members.deferred.promise.then(function(routeViewDriver){
			var resultsSectionViewDriver = routeViewDriver.addResultsSection(resultsSectionDescriptor);
			resultsSectionView.setResultsSectionViewDriver(resultsSectionViewDriver);
		});

		members.sectionViews.push(resultsSectionView);
		return resultsSectionView;
	},

	setRouteViewDriver: function(routeViewDriver){
		membersMap.get(this).deferred.resolve(routeViewDriver);

		routeViewDriver.getEventStream().onEnd(this, 'emit', 'unload');
	},

	getSearchTerm: function(){
		return membersMap.get(this).searchTerm;
	},

	destroy: function(){
		var members = membersMap.get(this);
		members.deferred.promise.then(function(routeViewDriver){
			routeViewDriver.destroy();
		});

		members.sectionViews.forEach(function(sectionView){
			sectionView.destroy();
		});

		membersMap.delete(this);
	}


	/**
	 * Fires an unload event when the view is no longer valid
	 */

});


var ResultsSectionDescriptor = /** @lends ResultsSectionDescriptor */ {

/**
 * The name of the section
 * @type {string}
 */
sectionName: null,

/**
 * Boolean whether or not to start the section collapsed or expanded
 * @type {Boolean}
 */
startCollapsed: null,

/**
 * The results to display
 * @type {[ResultDescriptor] or a Promise}
 */
results: null

};

module.exports = SearchResultsView;
