var assert = require('assert');
var _ = require('lodash');

var ComposeManager = function(platformImplementationLoader){
  this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(ComposeManager.prototype, {

  registerComposeButtonCreator: function(creator) {
    assert.equal(typeof creator, 'function', 'Parameter must be a function');
    assert.equal(arguments.length, 1, 'One parameter is required');

    this._platformImplementationLoader.load().then(function(platformImplementation) {
      platformImplementation.ComposeManager.registerComposeButtonCreator(creator);
    });
  },

  registerSidebarCreator: function(creator) {
    throw new Error("Not implemented yet");
  }

});

module.exports = ComposeManager;
