/* @flow */
//jshint ignore:start

import assert from "assert";
import _ from "lodash";
import fs from 'fs';
import RSVP from './lib/rsvp';
var readFile = RSVP.denodeify(fs.readFile.bind(fs));
import co from 'co';

import * as GmailResponseProcessor from '../src/platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import disallowEval from './lib/disallow-eval';

var loadJSON = require;

describe('GmailResponseProcessor', function() {
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
    it('message send response', function() {
      /*const*/var data = loadJSON('./data/gmail-response-processor/send-response.json');

      /*const*/var decoded = GmailResponseProcessor.deserialize(data.input);
      assert.deepEqual(decoded, data.output, 'deserialize test');

      /*const*/var reencoded = GmailResponseProcessor.threadListSerialize(decoded);
      /*const*/var redecoded = GmailResponseProcessor.deserialize(reencoded);
      assert.deepEqual(redecoded, data.output, 're-deserialize test');
    });

    it('suggestions', function() {
      /*const*/var data = loadJSON('./data/gmail-response-processor/suggestions.json');

      /*const*/var decoded = GmailResponseProcessor.deserialize(data.input);
      assert.deepEqual(decoded, data.output, 'deserialize test');

      /*const*/var reencoded = GmailResponseProcessor.suggestionSerialize(decoded);
      assert.strictEqual(reencoded, data.input, 'serialize test');
    });
  });

  describe('extractThreads', function() {
    it('works', function() {
      /*const*/var data = loadJSON('./data/gmail-response-processor/search-response.json');
      /*const*/var threads = GmailResponseProcessor.extractThreads(data.input);
      assert.deepEqual(threads, data.output, 'deserialize test');
    });
  });

  describe('replaceThreadsInResponse', function() {
    it('seems to work', function() {
      this.slow(100);

      /*const*/var data = loadJSON('./data/gmail-response-processor/search-response.json');
      /*const*/var threads = GmailResponseProcessor.extractThreads(data.input);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      /*const*/var swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it('works with small number of threads', function() {
      /*const*/var data = loadJSON('./data/gmail-response-processor/search-response-small.json');
      /*const*/var threads = GmailResponseProcessor.extractThreads(data.input);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      /*const*/var swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it('works on responses with empty last part', function() {
      /*const*/var data = loadJSON('./data/gmail-response-processor/search-response-empty-last-part.json');
      /*const*/var threads = GmailResponseProcessor.extractThreads(data.input);
      assert.strictEqual(threads.length, 2);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      /*const*/var swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it('can empty a response', function() {
      /*const*/var data = loadJSON('./data/gmail-response-processor/search-response-small.json');
      /*const*/var threads = GmailResponseProcessor.extractThreads(data.input);
      assert.strictEqual(threads.length, 2);

      /*const*/var emptied = GmailResponseProcessor.replaceThreadsInResponse(data.input, []);
      /*const*/var emptiedThreads = GmailResponseProcessor.extractThreads(emptied);
      assert.strictEqual(emptiedThreads.length, 0);

      /*const*/var refilled = GmailResponseProcessor.replaceThreadsInResponse(emptied, threads);
      /*const*/var refilledThreads = GmailResponseProcessor.extractThreads(refilled);
      assert.deepEqual(refilledThreads, threads);
      //assert.strictEqual(refilled, data.input);
    });

    it('works on empty responses', function() {
      /*const*/var data = loadJSON('./data/gmail-response-processor/search-response-empty.json');
      /*const*/var threads = GmailResponseProcessor.extractThreads(data.input);
      assert(Array.isArray(threads));
      assert.strictEqual(threads.length, 0);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);
    });
  });

  describe('interpretSentEmailResponse', function() {
    it('can read new thread', async function() {
      /*const*/var rawResponse = await readFile(__dirname+'/data/gmail-response-processor/sent-response.txt', 'utf8');
      /*const*/var response = GmailResponseProcessor.interpretSentEmailResponse(rawResponse);
      assert.strictEqual(response.gmailMessageId, '14a08f7810935cb3');
      assert.strictEqual(response.gmailThreadId, '14a08f7810935cb3');
    });

    it('can read reply', async function() {
      /*const*/var rawResponse = await readFile(__dirname+'/data/gmail-response-processor/sent-response2.txt', 'utf8');
      /*const*/var response = GmailResponseProcessor.interpretSentEmailResponse(rawResponse);
      assert.strictEqual(response.gmailMessageId, '14a090139a3835a4');
      assert.strictEqual(response.gmailThreadId, '14a08f7810935cb3');
    });
  });
});
