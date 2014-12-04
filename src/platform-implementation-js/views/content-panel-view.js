var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;


/**
* @class
* A view representing a panel of your apps content. This is the object that is returned when you add a sidebar content panel to a thread view or similar.
*/
var ContentPanelView = function(contentPanelViewImplementation){
    EventEmitter.call(this);

    this._contentPanelViewImplementation = contentPanelViewImplementation;
    this._bindToStreamEvents();
};

ContentPanelView.prototype = Object.create(EventEmitter.prototype);

_.extend(ContentPanelView.prototype, /** @lends ContentPanelView */ {

    /**
     * Removes the content panel from its host
     * @return {void}
     */
    remove: function(){
        this._contentPanelViewImplementation.remove();
    },

    _bindToStreamEvents: function(){
        this._contentPanelViewImplementation.getEventStream().map('.eventName').onValue(this, 'emit');
        this._contentPanelViewImplementation.getEventStream().onEnd(this, 'emit', 'unload');
    }

    /**
    * Fires when the content panel becomes visisble. This can happen the first time the Panel is shown or subsequent
    * times if the panel is presented in a tabbed interface and the ContentPanels tab is selected
    * @event ContentPanelView#activate
    */

    /**
    * Fires when the content panel is hidden. Typically this occurs when the user switches to another ContentPanel
    * @event ContentPanelView#deactivate
    */

    /**
    * Fires when the content panel view is no longer valid (i.e. the user navigates away from the thread with the sidebar)
    * @event ContentPanelView#unload
    */

});


module.exports = ContentPanelView;
