var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var SidebarContentPanelView = function(sidebarContentPanelViewImplementation){
    EventEmitter.call(this);

    this._contentPanelViewImplementation = sidebarContentPanelViewImplementation;
    this._bindToStreamEvents();
};

SidebarContentPanelView.prototype = Object.create(EventEmitter.prototype);

_.extend(SidebarContentPanelView.prototype, {

    remove: function(){
        this._contentPanelViewImplementation.remove();
    },

    _bindToStreamEvents: function(){
        var self = this;
        this._contentPanelViewImplementation.getEventStream().onValue(function(event){
            self.emit(event.eventName);
        });
    }

});


module.exports = SidebarContentPanelView;
