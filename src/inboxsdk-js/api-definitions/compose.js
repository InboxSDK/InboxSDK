var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var Compose = function(platformImplementationLoader){
    EventEmitter.call(this);

    this._platformImplementationLoader = platformImplementationLoader;
};

Compose.prototype = Object.create(EventEmitter.prototype);

_.extend(Compose.prototype, {

    on: function(event, callback){
        var self = this;
        this._platformImplementationLoader.load().then(function(platformImplementation){
            platformImplementation.Compose.on(event, callback);
        });

        return this;
    },

    getComposeView: function(){
        var self = this;
        return this._platformImplementationLoader.load().then(function(platformImplementation){

            return platformImplementation.Views.getComposeView();

        });

    }

});

module.exports = Compose;  
