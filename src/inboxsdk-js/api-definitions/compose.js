var _ = require('lodash');

var Compose = function(platformImplementationLoader){
    this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Compose.prototype, {

    registerComposeViewHandler: function(handler){
        return this._platformImplementationLoader.registerHandler('Compose', 'ComposeView', handler);        
    },

    getComposeView: function(){
        var self = this;
        return this._platformImplementationLoader.load().then(function(platformImplementation){

            return platformImplementation.Views.getComposeView();

        });
    }

});

module.exports = Compose;
