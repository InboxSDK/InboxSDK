var RSVP = require('rsvp');
var _ = require('lodash');
var loadScript = require('../../common/load-script');
var Mailbox = require('../api-definitions/mailbox');

var PlatformImplementationLoader = function(appId) {
    this._appId = appId;
};

_.extend(PlatformImplementationLoader.prototype, {
    load: _.once(function() {
        var appId = this._appId;
        if (global.__GmailSDKImpLoader) {
            return RSVP.resolve();
        }
        return this._loadScript().then(function() {
            if (!global.__GmailSDKImpLoader) {
                throw new Error("Implementation file did not load correctly");
            }
            return global.__GmailSDKImpLoader.load("0.1", appId);
        }).then(function(platformImplementation) {
            Mailbox.emit('example', 'implementation loaded');
            return platformImplementation;
        });
    }),

    _loadScript: function(){
      return loadScript('http://localhost:4567/platform-implementation.js');
    }
});
module.exports = PlatformImplementationLoader;
