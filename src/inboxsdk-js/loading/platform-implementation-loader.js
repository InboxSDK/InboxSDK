var RSVP = require('rsvp');
var _ = require('lodash');

var PlatformImplementationLoader = function(appId, opts) {
    var self = this;
    this.load = _.once(function() {
        return RSVP.resolve().then(function() {
            if (!global.__InboxSDKImpLoader) {
                return self._loadScript().then(function() {
                    if (!global.__InboxSDKImpLoader) {
                        throw new Error("Implementation file did not load correctly");
                    }
                });
            }
        }).then(function() {
            self._platformImplementation = global.__InboxSDKImpLoader.load("0.1", appId, opts);

            return self._platformImplementation;
        });
    });
};

_.extend(PlatformImplementationLoader.prototype, {
    _loadScript: function(){
        var loadScript = require('../../common/load-script');
        return loadScript(process.env.IMPLEMENTATION_URL);
    }
});

module.exports = PlatformImplementationLoader;
