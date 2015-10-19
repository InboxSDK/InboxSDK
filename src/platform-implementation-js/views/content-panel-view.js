var _ = require('lodash');
var EventEmitter = require('../lib/safe-event-emitter');

// documented in src/docs/
var ContentPanelView = function(contentPanelViewImplementation){
    EventEmitter.call(this);

    this._contentPanelViewImplementation = contentPanelViewImplementation;
    this._bindToStreamEvents();
};

ContentPanelView.prototype = Object.create(EventEmitter.prototype);

_.extend(ContentPanelView.prototype, {

    remove(){
        this._contentPanelViewImplementation.remove();
    },

    _bindToStreamEvents(){
        this._contentPanelViewImplementation.getEventStream().map('.eventName').onValue(this, 'emit');
        this._contentPanelViewImplementation.getEventStream().onEnd(this, 'emit', 'destroy');
    }

});


module.exports = ContentPanelView;
