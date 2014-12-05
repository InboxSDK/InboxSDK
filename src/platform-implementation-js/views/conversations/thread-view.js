var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var ContentPanelView = require('../content-panel-view');

/**
* @class
* Object that represents a visible thread view that the user has navigated to
*/
var ThreadView = function(threadViewImplementation, appId){
	EventEmitter.call(this);

	this._threadViewImplementation = threadViewImplementation;
	this._appId = appId;

	this._bindToStreamEvents();
};

ThreadView.prototype = Object.create(EventEmitter.prototype);

_.extend(ThreadView.prototype, /** @lends ThreadView */ {

	/**
	 * Inserts a content panel into the sidebar of a thread view. A content panel simply displays your content to the user, typically
	 * in the form of a sidebar. ThreadViewss can have multiple content panels added to them and the SDK will handle creating a tabbed
	 * interface if needed
	 * @param  {ContentPanelDescriptor} contentPanelDescriptor - The details of the content panel to add to the thread's sidebar
	 * @return {ContentPanelView}
	 */
	addSidebarContentPanel: function(descriptor){
		var contentPanelImplementation = this._threadViewImplementation.addSidebarContentPanel(descriptor, this._appId);
		if(contentPanelImplementation){
			return new ContentPanelView(contentPanelImplementation);
		}

		return null;
	},

	_bindToStreamEvents: function(){
		this._threadViewImplementation.getEventStream().onEnd(this, 'emit', 'unload');
	}


	/**
	 * Fires when the thread view is no longer visible (i.e. the user navigates away from the thread)
	 * @event ThreadView#unload
	 */

});

module.exports = ThreadView;



/**
 * @class
 * This type is passed into the <code>ThreadView.addSidebarContentPanel</code> method as a way to configure the content panel shown.
 * ContentPanels are typically shown in a sidebar and when multiple are shown they are displayed in a multi tab interface.
 */
var ContentPanelDescriptor = /** @lends ContentPanelDescriptor */ {

	/**
	* The element to display in the content panel
	* @type{Element}
	*/
	el:  null,

	/**
	 * The text to show in the tab
	 * @type {string}
	 */
	title: null,


	/**
	 * URL for the icon to show in the tab. Should be a local extension file URL or a HTTPS url
	 * @type {string}
	 */
	iconUrl: null,

	/**
	 * If multiple content panels for your app are added then they will be ordered by this value
	 * ^optional
	 * ^default=0
	 * @type{number}
	 */
	orderHint: null
};
