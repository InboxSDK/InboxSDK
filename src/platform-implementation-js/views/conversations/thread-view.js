var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var Map = require('es6-unweak-collections').Map;

var ContentPanelView = require('../content-panel-view');

var memberMap = new Map();

/**
* @class
* Object that represents a visible thread view that the user has navigated to
*/
var ThreadView = function(threadViewImplementation, appId, membraneMap){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.threadViewImplementation = threadViewImplementation;
	members.appId = appId;
	members.membraneMap = membraneMap;

	_bindToStreamEvents(this, threadViewImplementation);
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
		var members = memberMap.get(this);
		var contentPanelImplementation = members.threadViewImplementation.addSidebarContentPanel(descriptor, members.appId);
		if(contentPanelImplementation){
			return new ContentPanelView(contentPanelImplementation);
		}

		return null;
	},

	/**
	* Gets all the loaded MessageView objects in the thread. See MessageView for more information on what "loaded" means.
	* @return {MessageView[]} an array of message view objects
	*/
	getMessageViews: function(){
		var members = memberMap.get(this);

		return _.chain(members.threadViewImplementation.getMessageViewDrivers())
				 .filter(function(messageViewDriver){
				 	return messageViewDriver.isLoaded();
				 })
				 .map(function(messageViewDriver){
				 	return members.membraneMap.get(messageViewDriver);
				 })
				 .value();
	},

	/**
	* Gets all the MessageView objects in the thread regardless of their load state. See MessageView for more information on what "loaded" means.
	* @return {MessageView[]} an array of message view objects
	*/
	getMessageViewsAll: function(){
		var members = memberMap.get(this);

		return _.chain(members.threadViewImplementation.getMessageViewDrivers())
				 .map(function(messageViewDriver){
				 	return members.membraneMap.get(messageViewDriver);
				 })
				 .value();
	}


	/**
	 * Fires when the user hovers over a contact on any message in the thread {ContactHoverEvent}
	 * @event ThreadView#contactHover
	 *
	 */

	/**
	 * Fires when the thread view is no longer visible (i.e. the user navigates away from the thread)
	 * @event ThreadView#destroy
	 */

});

module.exports = ThreadView;


function _bindToStreamEvents(threadView, threadViewImplementation){
	threadViewImplementation.getEventStream().onEnd(threadView, 'emit', 'destroy');

	threadViewImplementation
		.getEventStream()
		.filter(function(event){
			return event.type !== 'internal' && event.eventName === 'contactHover';
		})
		.onValue(function(event){
			threadView.emit(event.eventName, {
				contactType: event.contactType,
				messageView: memberMap.get(threadView).membraneMap.get(event.messageViewDriver),
				contact: event.contact,
				threadView: threadView
			});
		});
}



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
