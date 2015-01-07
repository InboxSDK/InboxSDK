var _ = require('lodash');
var RSVP = require('rsvp');

var EventEmitter = require('events').EventEmitter;

var Map = require('es6-unweak-collections').Map;

var membersMap = new Map();

/**
 * This class represents a result section.
 */
var CollapsibleSectionView = function(collapsibleSectionViewDriver, driver){
	EventEmitter.call(this);

	var members = {};
	membersMap.set(this, members);
	members.collapsibleSectionViewDriver = collapsibleSectionViewDriver;

	_bindToEventStream(this, collapsibleSectionViewDriver, driver);
};

CollapsibleSectionView.prototype = Object.create(EventEmitter.prototype);

_.extend(CollapsibleSectionView.prototype, {

	/**
	 * Set the results for this section
	 * @param {ResultDescriptor[]}
	 */
	setTableRows: function(rows){
		if(!membersMap.has(this)){
			return;
		}

		membersMap.get(this).collapsibleSectionViewDriver.setTableRows(rows);
	},

	destroy: function(){
		if(!membersMap.has(this)){
			return;
		}

		var members = membersMap.get(this);

		members.collapsibleSectionViewDriver.destroy();

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


function _bindToEventStream(collapsibleSectionView, collapsibleSectionViewDriver, driver){
	collapsibleSectionViewDriver
		.getEventStream()
		.map('.eventName')
		.onValue(collapsibleSectionView, 'emit');

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'rowClicked';
		})
		.map('.rowDescriptor')
		.onValue(function(rowDescriptor){
			if(rowDescriptor.routeID){
				driver.goto(rowDescriptor.routeID, rowDescriptor.routeParams);
			}

			if(_.isFunction(rowDescriptor.onClick)){
				rowDescriptor.onClick();
			}
		});

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'summaryClicked';
		})
		.map('.collapsibleSectionDescriptor')
		.onValue(function(collapsibleSectionDescriptor){
			if(collapsibleSectionDescriptor.onSummaryClick){
				collapsibleSectionDescriptor.onSummaryClick(collapsibleSectionView);
			}
		});

	collapsibleSectionViewDriver.getEventStream().onEnd(collapsibleSectionView, 'emit', 'unload');
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
routeID: null,

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



module.exports = CollapsibleSectionView;
