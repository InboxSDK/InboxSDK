var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var ContentPanelView = function(contentPanelViewImplementation){
    EventEmitter.call(this);

    this._contentPanelViewImplementation = contentPanelViewImplementation;
    this._bindToStreamEvents();
};

ContentPanelView.prototype = Object.create(EventEmitter.prototype);

_.extend(ContentPanelView.prototype, {

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


module.exports = ContentPanelView;
