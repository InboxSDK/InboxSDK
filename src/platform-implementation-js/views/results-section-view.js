var _ = require('lodash');
var RSVP = require('rsvp');

var EventEmitter = require('events').EventEmitter;

var Map = require('es6-unweak-collections').Map;
var membersMap = new Map();

var ResultsSectionView = function(router){
	EventEmitter.call(this);

	var members = {};
	membersMap.set(this, members);

	members.deferred = RSVP.defer();

	members.deferred.promise.then(_bindToEventStream(this, router));
};

ResultsSectionView.prototype = Object.create(EventEmitter.prototype);

_.extend(ResultsSectionView.prototype, {

	setResultsSectionViewDriver: function(resultsSectionViewDriver){
		membersMap.get(this).deferred.resolve(resultsSectionViewDriver);
	},

	setResults: function(resultsArray){
		membersMap.get(this).deferred.promise.then(function(resultsSectionViewDriver){
			resultsSectionViewDriver.setResults(resultsArray);
		});
	},

	destroy: function(){
		var members = membersMap.get(this);

		members.deferred.promise.then(function(resultsSectionViewDriver){
			resultsSectionViewDriver.destroy();
		});

		membersMap.delete(this);
	}

});


function _bindToEventStream(resultsSectionView, router){
	return function(resultsSectionViewDriver){
		resultsSectionViewDriver
			.getEventStream()
			.map('.eventName')
			.onValue(resultsSectionView, 'emit');

		resultsSectionViewDriver
			.getEventStream()
			.filter({eventName: 'rowClicked'})
			.map('.resultDescriptor')
			.onValue(function(resultDescriptor){
				if(resultDescriptor.routeName){
					router.goto(resultDescriptor.routeName, resultDescriptor.routeParams);
				}

				if(_.isFunction(resultDescriptor.onClick)){
					resultDescriptor.onClick();
				}
			});
	};
}


module.exports = ResultsSectionView;
