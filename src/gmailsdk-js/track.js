var assert = require('assert');
var Interface = require('./interface');

function track(eventName, details) {
  assert.equal(typeof eventName, 'string', 'eventName must be a string');
  if (details) {
    assert.equal(typeof details, 'object', 'details must be an object');
  }
  if (arguments.length > 2) {
    throw new Error("Too many parameters");
  }
  Interface.load().then(function(Imp) {
    Imp.Utils.track(eventName, details);
  });
}

module.exports = track;
