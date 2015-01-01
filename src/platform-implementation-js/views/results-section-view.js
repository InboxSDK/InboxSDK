var _ = require('lodash');
var RSVP = require('rsvp');

var EventEmitter = require('events').EventEmitter;

var Map = require('es6-unweak-collections').Map;

/**
 * This class represents a result section.
 */
var ResultsSectionView = function(resultsSectionViewDriver, driver){
	EventEmitter.call(this);

	var members = {};
	membersMap.set(this, members);
	members.resultsSectionViewDriver = resultsSectionViewDriver;

	_bindToEventStream(this, resultsSectionViewDriver, driver);
};

ResultsSectionView.prototype = Object.create(EventEmitter.prototype);

_.extend(ResultsSectionView.prototype, {

	/**
	 * Set the results for this section
	 * @param {[ResultDescriptor]}
	 */
	setResults: function(resultsArray){
		if(!membersMap.has(this)){
			return;
		}

		membersMap.get(this).resultsSectionViewDriver.setResults(resultsArray);
	},

	destroy: function(){
		if(!membersMap.has(this)){
			return;
		}

		var members = membersMap.get(this);

		members.resultsSectionViewDriver.destroy();

		this.removeAllListeners();
		membersMap.delete(this);
	}

	/**
	 * Fires "unload" event when no longer valid
	 */

	/**
	 * Fires "expanded" event when section is expanded
	 */

	/**
	 * Fires "collapsed" event when section is collapsed
	 */

});


function _bindToEventStream(resultsSectionView, resultsSectionViewDriver, driver){
	resultsSectionViewDriver
		.getEventStream()
		.map('.eventName')
		.onValue(resultsSectionView, 'emit');

	resultsSectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'rowClicked';
		})
		.map('.resultDescriptor')
		.onValue(function(resultDescriptor){
			if(resultDescriptor.routeName){
				driver.goto(resultDescriptor.routeName, resultDescriptor.routeParams);
			}

			if(_.isFunction(resultDescriptor.onClick)){
				resultDescriptor.onClick();
			}
		});

	resultsSectionViewDriver.getEventStream().onEnd(resultsSectionView, 'emit', 'unload');
}


var ResultDescriptor = /** @lends ResultDescriptor */ {

/**
 * An optional url to an icon to display an icon alongside the name of the NavItem
 * ^optional
 * ^default=null
 * @type {string}
 */
iconUrl: null,

/**
 * An optional class to apply to the icon
 * ^optional
 * ^default=null
 * @type {string}
 */
iconClass: null,


/**
 * Bolded text, first textual column
 * @type {string}
 */
title: null,

/**
 * unbolded text, 2nd textual column
 * @type {string}
 */
body: null,

/**
 * Last text right-aligned. Often used for dates.
 * @type {string}
 */
extraText: null,


/**
 * The name of the route to navigate to when the result is clicked on
 * ^optional
 * ^default=null
 * @type {string}
 */
routeName: null,

/**
 * The parameters of the route being navigated to when the result is clicked on
 * ^optional
 * ^default=null
 * @type {string[]}
 */
routeParams: null,


/**
 * Callback for when the result is clicked on
 * ^optional
 * ^default=null
 * @type {function}
 */
onClick: null

};



module.exports = ResultsSectionView;
