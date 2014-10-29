var assert = require('assert');
var Interface = require('./interface');

module.exports = {
  registerComposeButtonCreator: function(creator) {
    assert.equal(typeof creator, 'function', 'Parameter must be a function');
    assert.equal(arguments.length, 1, 'One parameter is required');
    Interface.load().then(function(Imp) {
      Imp.ComposeManager.registerComposeButtonCreator(creator);
    });
  },
  registerSidebarCreator: function(creator) {
    throw new Error("Not implemented yet");
  }
};
