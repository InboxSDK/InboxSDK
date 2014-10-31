var assert = require('assert');

module.exports = function(platformImplementationLoader) {
  function track(eventName, details) {
    assert.equal(typeof eventName, 'string', 'eventName must be a string');
    if (details) {
      assert.equal(typeof details, 'object', 'details must be an object');
      // Make sure it's JSON encodable
      JSON.stringify(details);
    }

    if (arguments.length > 2) {
      throw new Error("Too many parameters");
    }
    platformImplementationLoader.load().then(function(Imp) {
      Imp.Utils.track(eventName, details);
    });
  }

  return track;
};
