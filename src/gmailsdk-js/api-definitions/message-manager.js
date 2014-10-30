var assert = require('assert');
var _ = require('lodash');

var MessageManager = function(platformImplementationLoader){
  this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(MessageManager.prototype, {

  register: function(definition) {
    this._platformImplementationLoader.load().then(function(platformImplementation) {
      platformImplementation.MessageManager.register(definition);
    });
  }

});

module.exports = MessageManager;
