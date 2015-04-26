var _ = require('lodash');
var RSVP = require('rsvp');

var SectionView = require('./section-view');

var membersMap = new WeakMap();

/**
* @class
* CollapsibleSectionViews allow you to display additional content on ListRouteViews. They are
* typically rendered as additional content above the list of threads below. The visual style
* is similar to that of multiple inbox sections used in native Gmail and Inbox. Note that the
* rendering may vary slightly depending on the actual ListRouteView that the CollapsibleSectionView
* is rendered in. For example, CollapsibleSectionViews rendered on search results pages use different
* header styles to match Gmail's style more accurately.
*
* You can either render rows (that are visually similar to Gmail/Inbox rows) or custom content in
* your CollapsibleSectionView. However, until you call one of <code>setTableRows</code> or <code>setContent</code>
* the CollapsibleSectionView will simply display a "Loading..." indicator.
*/
var CollapsibleSectionView = function(collapsibleSectionViewDriver, driver){
	var members = {};
	membersMap.set(this, members);
	members.collapsibleSectionViewDriver = collapsibleSectionViewDriver;

	_bindToEventStream(this, collapsibleSectionViewDriver, driver);
};

CollapsibleSectionView.prototype = Object.create(SectionView.prototype);

_.extend(CollapsibleSectionView.prototype, /** @lends CollapsibleSectionView */ {

	/**
	* @param {boolean} value - whether to collapse (minimize) the section view
	* @return {void}
	*/
	setCollapsed: function(value){
		membersMap.get(this).collapsibleSectionViewDriver.setCollapsed(value);
	},

	/**
	* Removes this section from the current Route
	* @return {void}
	*/
	remove: function(){
		this.destroy();
	},

	destroy: function(){
		if(!membersMap.has(this)){
			return;
		}

		var members = membersMap.get(this);

		members.collapsibleSectionViewDriver.destroy();

		this.removeAllListeners();
	}

	/**
	* Fires when the CollapsibleSectionView is no longer visible
	* @event CollapsibleSectionView#destroy
	*/

	/**
	* Fires when the CollapsibleSectionView is expanded
	* @event CollapsibleSectionView#expanded
	*/

	/**
	* Fires when the CollapsibleSectionView is collapsed
	* @event CollapsibleSectionView#collapsed
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
			return event.eventName === 'titleLinkClicked';
		})
		.map('.sectionDescriptor')
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onTitleLinkClick){
				sectionDescriptor.onTitleLinkClick(collapsibleSectionView);
			}
		});

	collapsibleSectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'footerClicked';
		})
		.map('.sectionDescriptor')
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onFooterLinkClick){
				sectionDescriptor.onFooterLinkClick(collapsibleSectionView);
			}
		});

	collapsibleSectionViewDriver.getEventStream().onEnd(collapsibleSectionView, 'emit', 'destroy');
}

module.exports = CollapsibleSectionView;
