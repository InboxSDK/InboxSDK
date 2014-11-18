var _ = require('lodash');

var Modal = function(platformImplementationLoader){
    this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Modal.prototype, {

    show: function(options){
        if(!this._platformImplementationLoader.getPlatformImplementation()){
            console.warn('You tried calling this function before the SDK was ready. Use InboxSDK.ready().then(callback).')
            return null;
        }

        return this._platformImplementationLoader.getPlatformImplementation().Modal.show(options);
    }

});

module.exports = Modal;
