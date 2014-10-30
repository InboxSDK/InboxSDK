var assert = require('assert');
var sinon = require('sinon');
var RSVP = require('./lib/rsvp');
var logErrorFactory = require('../src/common/log-error-factory');

describe("logErrorFactory", function() {
  var logError, reporter, consoleMock;

  beforeEach(function() {
    consoleMock = sinon.mock(console)
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

  it('should handle errors with only text', function() {
    consoleMock.expects("error").once();
    logError("message");
    consoleMock.restore();

    return RSVP.resolve().then(function() {
      assert(reporter.calledOnce);
      assert.strictEqual(typeof reporter.firstCall.args[0], 'string');
      assert.strictEqual(reporter.firstCall.args[1], 'message');
      assert.strictEqual(reporter.firstCall.args[2], undefined);
      assert.strictEqual(reporter.firstCall.args[3], undefined);
    });
  });

  it("shouldn't log errors twice", function() {
    var errTest = new Error("Testing test");

    consoleMock.expects("error").once();
    logError("test", errTest);
    logError("test2", errTest);
    logError(errTest);
    consoleMock.restore();

    return RSVP.resolve().then(function() {
      assert(reporter.calledOnce);
      assert.strictEqual(typeof reporter.firstCall.args[0], 'string');
      assert.strictEqual(reporter.firstCall.args[1], 'test');
      assert.strictEqual(reporter.firstCall.args[2], errTest);
    });
  });

  it("shouldn't freak out over weird arguments", function() {
    consoleMock.expects("error").thrice();
    logError(1, 2, 3);
    logError("test2", null, NaN);
    logError(new Error("Important stuff"));
    consoleMock.restore();

    return RSVP.resolve().then(function() {
      assert(reporter.calledThrice);
    });
  });

  it("shouldn't freak out if given immutable objects", function() {
    var x = Object.freeze({});
    consoleMock.expects("error").thrice();
    logError(x);
    logError(x, x);
    logError(x, x, x);
    consoleMock.restore();

    return RSVP.resolve().then(function() {
      assert(reporter.calledThrice);
    });
  });
});
