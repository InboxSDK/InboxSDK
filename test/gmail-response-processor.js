var assert = require("assert");
var _ = require("lodash");
var fs = require('fs');
var RSVP = require('./lib/rsvp');
var readFile = RSVP.denodeify(fs.readFile.bind(fs));

var GmailResponseProcessor = require('../src/platform-implementation-js/dom-driver/gmail/gmail-response-processor');
var disallowEval = require('./lib/disallow-eval');

describe('GmailResponseProcessor', function(){
  disallowEval();

  describe('rewriteSingleQuotes', function() {
    it('test1', function() {
      var r = GmailResponseProcessor.rewriteSingleQuotes.bind(GmailResponseProcessor);
      assert.strictEqual('"ab"', r('\'ab\''), 'basic');
      assert.strictEqual('"a\\"b"', r('\'a"b\''), 'double quote escape');
      assert.strictEqual('."a\\"b"', r('.\'a"b\''), 'double quote escape');
      assert.strictEqual('"a\\"b"', r('"a\\"b"'), 'nop');
      assert.strictEqual('"a\\"b\'c"d"\'e"', r('"a\\"b\'c"d"\'e"'),
        "check double quote surrounded by single quotes (in double quote parts) isn't escaped");
      assert.strictEqual('"a\\\\\\\\\\"b"', r('"a\\\\\\\\\\"b"'), 'escape testing 1');
      assert.strictEqual('"a\\\\\\\\\\"b"', r('\'a\\\\\\\\"b\''), 'escape testing 2');
    });
  });

  describe('serialization', function() {
    it('test1', function() {
      var data = require('./data/gmail-response-processor.json');

      var decoded = GmailResponseProcessor.deserialize(data.input1);
      assert.deepEqual(decoded, data.output1, 'deserialize test');

      var reencoded = GmailResponseProcessor.serialize(decoded);
      var redecoded = GmailResponseProcessor.deserialize(reencoded);
      assert.deepEqual(redecoded, data.output1, 're-deserialize test');
    });
  });

  describe('interpretSentEmailResponse', function() {
    it('can read new thread', function() {
      return readFile(
        __dirname+'/data/gmail-message-sent-response.txt', 'utf8'
      ).then(function(rawResponse) {
        var response = GmailResponseProcessor.interpretSentEmailResponse(rawResponse);
        assert.strictEqual(response.gmailMessageId, '14a08f7810935cb3');
        assert.strictEqual(response.gmailThreadId, '14a08f7810935cb3');
      });
    });

    it('can read reply', function() {
      return readFile(
        __dirname+'/data/gmail-message-sent-response2.txt', 'utf8'
      ).then(function(rawResponse) {
        var response = GmailResponseProcessor.interpretSentEmailResponse(rawResponse);
        assert.strictEqual(response.gmailMessageId, '14a090139a3835a4');
        assert.strictEqual(response.gmailThreadId, '14a08f7810935cb3');
      });
    });

  });
});
