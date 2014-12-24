var _ = require('lodash');
var RSVP = require('rsvp');

var ResultsSectionView = require('./results-section-view');

var EventEmitter = require('events').EventEmitter;

var Map = require('es6-unweak-collections').Map;
var membersMap = new Map();


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

	addResultsSection: function(resultsDescriptor){
		var members = membersMap.get(this);
		var resultsSectionView = new ResultsSectionView(members.router);

		members.deferred.promise.then(function(routeViewDriver){
			var resultsSectionViewDriver = routeViewDriver.addResultsSection(resultsDescriptor);
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

});

module.exports = SearchResultsView;
