var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;


/**
* @class
* This is the object that is returned when you add a sidebar content panel to a thread view.
*/
var ContentPanelView = function(contentPanelViewImplementation){
    EventEmitter.call(this);

    this._contentPanelViewImplementation = contentPanelViewImplementation;
    this._bindToStreamEvents();
};

ContentPanelView.prototype = Object.create(EventEmitter.prototype);

_.extend(ContentPanelView.prototype, /** @lends ContentPanelView */ {

    /**
     * removes the content panel
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
    * Fires when the content panel becomes visisble (user clicks on the tab)
    * @event ContentPanelView#activate
    */

    /**
    * Fires when the content panel gets hidden by another panel
    * @event ContentPanelView#deactivate
    */

    /**
    * Fires when the content panel view is no longer valid (i.e. the user navigates away from the thread with the sidebar)
    * @event ContentPanelView#unload
    */

});


module.exports = ContentPanelView;
