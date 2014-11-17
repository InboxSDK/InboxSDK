var _ = require('lodash');

var Widgets = function(platformImplementationLoader){
    this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Widgets.prototype, {

    createModal: function(options){
        if(!this._platformImplementationLoader.getPlatformImplementation()){
            console.warn('You tried calling this function before the SDK was ready. Use InboxSDK.ready().then(callback).')
            return null;
        }

        return this._platformImplementationLoader.getPlatformImplementation().Widgets.createModal(options);
    }

});

module.exports = Widgets;
