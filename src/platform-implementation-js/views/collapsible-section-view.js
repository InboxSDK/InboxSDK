var _ = require('lodash');
var RSVP = require('rsvp');

var EventEmitter = require('events').EventEmitter;

var Map = require('es6-unweak-collections').Map;

var membersMap = new Map();

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
	EventEmitter.call(this);

	var members = {};
	membersMap.set(this, members);
	members.collapsibleSectionViewDriver = collapsibleSectionViewDriver;

	_bindToEventStream(this, collapsibleSectionViewDriver, driver);
};

CollapsibleSectionView.prototype = Object.create(EventEmitter.prototype);

_.extend(CollapsibleSectionView.prototype, /** @lends CollapsibleSectionView */ {

	setCollapsed: function(value){
		membersMap.get(this).collapsibleSectionViewDriver.setCollapsed(value);
	},

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
		membersMap.delete(this);
	}

	/**
	 * Fires "destroy" event when no longer valid
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

/**
* @class
* Represents the a single row to render in CollapsibleSectionViews
*/
var RowDescriptor = /** @lends RowDescriptor */ {

	/**
	 * First textual column
	 * @type {string}
	 */
	title: null,

	/**
	 * Second textual column
	 * @type {string}
	 */
	body: null,

	/**
	 * Last text right-aligned. Often used for dates.
	 * @type {string}
	 */
	shortDetailText: null,

	/**
	* Whether the row should be rendered as read or unread similar to Gmail and Inbox styles
	* @type {string}
	*/
	isRead: null,

	/**
	* Any labels that should be rendered. A LabelDescriptor simply has title, backgroundColor, and foregroundColor string properties.
	* @type {LabelDescriptor[]}
	*/
	labels: null,

	/**
	* An optional url to an icon to display on the left side of the row
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
	 * The name of the route to navigate to when the row is clicked on
	 * ^optional
	 * ^default=null
	 * @type {string}
	 */
	routeID: null,

	/**
	 * The parameters of the route being navigated to when the row is clicked on
	 * ^optional
	 * ^default=null
	 * @type {string[]}
	 */
	routeParams: null,


	/**
	 * Callback for when the row is clicked on
	 * ^optional
	 * ^default=null
	 * @type {function}
	 */
	onClick: null

};


/**
* @class
* The properties required to create a CollapsibleSectionView
*/
var CollapsibleSectionDescriptor = /** @lends CollapsibleSectionDescriptor */ {

	/**
	* Main title
	* @type {string}
	*/
	title: null,

	/**
	* Subtitle
	* ^optional
	* ^default=null
	* @type {string}
	*/
	subtitle: null,

	/**
	* Text to display in the summary area of the CollapsibleSectionView. Typically page
	* counts are displayed here.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	titleLinkText: null,

	/**
	* A function to call when the summary text has been clicked
	* ^optional
	* ^default=null
	* @type {function()}
	*/
	onTitleLinkClick: null,

	/**
	* Whether to display a dropdown arrow for more options on the collapsible section
	* ^optional
	* ^default=false
	* @type {boolean}
	*/
	hasDropdown: null,

	/**
	* A function to call when the dropdown is opened. Your function is passed an
	* event object with a single <code>dropdown</code> property.
	* ^optional
	* ^default=null
	* @type {function(event)}
	*/
	onDropdownClick: null,

	footerLinkText: null,

	onFooterLinkClick: null
};



module.exports = CollapsibleSectionView;
