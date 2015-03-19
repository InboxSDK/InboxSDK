var RSVP = require('rsvp');
var _ = require('lodash');

function PlatformImplementationLoader(appId, opts) {
    this.load = _.once(() => {
        return RSVP.resolve().then(() => {
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

_.extend(PlatformImplementationLoader.prototype, {
    _loadScript: function(){
        const loadScript = require('../../common/load-script');
        return loadScript(process.env.IMPLEMENTATION_URL);
    }
});

module.exports = PlatformImplementationLoader;
