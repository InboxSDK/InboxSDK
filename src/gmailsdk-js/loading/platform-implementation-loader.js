var RSVP = require('rsvp');
var _ = require('lodash');

var PlatformImplementationLoader = function(appId) {
    var self = this;
    this.load = _.once(function() {
        return RSVP.resolve().then(function() {
            if (!global.__GmailSDKImpLoader) {
                return self._loadScript().then(function() {
                    if (!global.__GmailSDKImpLoader) {
                        throw new Error("Implementation file did not load correctly");
                    }
                });
            }
        }).then(function() {
            return global.__GmailSDKImpLoader.load("0.1", appId);
        });
    });
};

_.extend(PlatformImplementationLoader.prototype, {
    _loadScript: function(){
        var loadScript = require('../../common/load-script');
        return loadScript('http://localhost:4567/platform-implementation.js');
    }
});

module.exports = PlatformImplementationLoader;
