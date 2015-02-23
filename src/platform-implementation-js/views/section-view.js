var _ = require('lodash');
var RSVP = require('rsvp');

var EventEmitter = require('events').EventEmitter;

var membersMap = new WeakMap();

/**
* @class
* SectionViews allow you to display additional content on ListRouteViews. They are
* typically rendered as additional content above the list of threads below. The visual style
* is similar to that of multiple inbox sections used in native Gmail and Inbox. Note that the
* rendering may vary slightly depending on the actual ListRouteView that the SectionView
* is rendered in. For example, SectionViews rendered on search results pages use different
* header styles to match Gmail's style more accurately.
*
* You can either render rows (that are visually similar to Gmail/Inbox rows) or custom content in
* your SectionView. However, until you call one of <code>setTableRows</code> or <code>setContent</code>
* the SectionView will simply display a "Loading..." indicator.
*/
var SectionView = function(sectionViewDriver, driver){
	EventEmitter.call(this);

	var members = {};
	membersMap.set(this, members);
	members.sectionViewDriver = sectionViewDriver;

	_bindToEventStream(this, sectionViewDriver, driver);
};

SectionView.prototype = Object.create(EventEmitter.prototype);

_.extend(SectionView.prototype, /** @lends SectionView */ {

	remove: function(){
		this.destroy();
	},

	destroy: function(){
		if(!membersMap.has(this)){
			return;
		}

		var members = membersMap.get(this);

		members.sectionViewDriver.destroy();

		this.removeAllListeners();
	}

	/**
	 * Fires "destroy" event when no longer valid
	 */

});


function _bindToEventStream(sectionView, sectionViewDriver, driver){
	sectionViewDriver
		.getEventStream()
		.map('.eventName')
		.onValue(sectionView, 'emit');

	sectionViewDriver
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

	sectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'summaryClicked';
		})
		.map('.sectionDescriptor')
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onTitleLinkClick){
				sectionDescriptor.onTitleLinkClick(sectionView);
			}
		});

	sectionViewDriver
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'footerClicked';
		})
		.map('.sectionDescriptor')
		.onValue(function(sectionDescriptor){
			if(sectionDescriptor.onFooterLinkClick){
				sectionDescriptor.onFooterLinkClick(sectionView);
			}
		});

	sectionViewDriver.getEventStream().onEnd(sectionView, 'emit', 'destroy');
}



module.exports = SectionView;
