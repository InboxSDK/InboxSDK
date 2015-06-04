import assign from 'lodash/object/assign';
import once from 'lodash/function/once';

function PlatformImplementationLoader(appId, opts) {
    this.load = once(() => {
        return global.Promise.resolve().then(() => {
            if (!global.__InboxSDKImpLoader) {
                return this._loadScript().then(() => {
                    if (!global.__InboxSDKImpLoader) {
                        throw new Error("Implementation file did not load correctly");
                    }
                });
            }
        }).then(() =>
            global.__InboxSDKImpLoader.load("0.1", appId, opts)
        ).then(platformImplementation => {
            this._platformImplementation = platformImplementation;
            return platformImplementation;
        });
    });
}

assign(PlatformImplementationLoader.prototype, {
    _loadScript: function(){
        const loadScript = require('../../common/load-script');
        return loadScript(process.env.IMPLEMENTATION_URL);
    }
});

module.exports = PlatformImplementationLoader;
