var assert = require('assert');
var sinon = require('sinon');
var RSVP = require('./lib/rsvp');
var logErrorFactory = require('../src/common/log-error-factory');

describe("logErrorFactory", function() {
  var logError, reporter;
  var consoleMock = sinon.mock(console);

  beforeEach(function() {
    reporter = sinon.spy();
    logError = logErrorFactory(reporter);
  });

  afterEach(function() {
    consoleMock.restore();
    consoleMock.verify();
  });

  it("should pass data to reporter", function() {
    var errTest = new Error("Testing test");
    var details = {a: 5};

    consoleMock.expects("error").once();
    logError("test", errTest, details);
    consoleMock.restore();

    return RSVP.resolve().then(function() {
      assert(reporter.calledOnce);
      assert.strictEqual(typeof reporter.firstCall.args[0], 'string');
      assert.strictEqual(reporter.firstCall.args[1], 'test');
      assert.strictEqual(reporter.firstCall.args[2], errTest);
      assert.strictEqual(reporter.firstCall.args[3], details);
    });
  });
});
