var assert = require('assert');
var _ = require('lodash');

var AttachmentCardManager = function(platformImplementationLoader){
  this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(AttachmentCardManager.prototype, {

  register: function(definition) {
    this._platformImplementationLoader.load().then(function(platformImplementation) {
      platformImplementation.AttachmentCardManager.register(definition);
    });
  }

});

module.exports = AttachmentCardManager;
