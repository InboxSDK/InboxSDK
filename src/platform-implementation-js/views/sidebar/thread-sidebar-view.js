var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var SidebarContentPanelView = require('./sidebar-content-panel-view');

var ThreadSidebarView = function(threadSidebarViewImplementation, driver){
    EventEmitter.call(this);

    this._threadSidebarViewImplementation = threadSidebarViewImplementation;
    this._driver = driver;

    this._bindToEventStream();
};

ThreadSidebarView.prototype = Object.create(EventEmitter.prototype);

_.extend(ThreadSidebarView.prototype, {

    /*
     * options = {
     *   title: <string>,
     *   iconUrl: <string>
     *   el: element, html string
     * }
     */

    addContentPanel: function(options){
        var contentPanelImplementation = this._threadSidebarViewImplementation.addContentPanel(options);
        return new SidebarContentPanelView(contentPanelImplementation);
    },

    getThread: function(){
        return this._driver.getThread();
    },

    _bindToEventStream: function(){
        this._threadSidebarViewImplementation.getEventStream().onEnd(this, 'emit', 'close');
    }

});


module.exports = ThreadSidebarView;
