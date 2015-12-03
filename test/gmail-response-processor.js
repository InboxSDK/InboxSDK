/* @flow */
//jshint ignore:start

import assert from "assert";
import _ from "lodash";
import fs from 'fs';
import RSVP from './lib/rsvp';
const readFile = RSVP.denodeify(fs.readFile.bind(fs));
import co from 'co';

import * as GmailResponseProcessor from '../src/platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import disallowEval from './lib/disallow-eval';

const loadJSON = require;

describe('GmailResponseProcessor', function() {
  disallowEval();

  describe('rewriteSingleQuotes', function() {
    const r = s => GmailResponseProcessor.rewriteSingleQuotes(s);

    it('test1', function() {
      assert.strictEqual(r('\'ab\''), '"ab"', 'basic');
      assert.strictEqual(r('\'a"b\''), '"a\\"b"', 'double quote escape');
      assert.strictEqual(r('.\'a"b\''), '."a\\"b"', 'double quote escape');
      assert.strictEqual(r('"a\\"b"'), '"a\\"b"', 'nop');
      assert.strictEqual(r('"a\\"b\'c"d"\'e"'), '"a\\"b\'c"d"\'e"',
        "check double quote surrounded by single quotes (in double quote parts) isn't escaped");
      assert.strictEqual(r('"a\\\\\\\\\\"b"'), '"a\\\\\\\\\\"b"', 'escape testing 1');
      assert.strictEqual(r('\'a\\\\\\\\"b\''), '"a\\\\\\\\\\"b"', 'escape testing 2');
    });
  });

  describe('serialization', function() {
    it('message send response', function() {
      const data = loadJSON('./data/gmail-response-processor/send-response.json');

      const decoded = GmailResponseProcessor.deserialize(data.input).value;
      assert.deepEqual(decoded, data.output, 'deserialize test');

      const reencoded = GmailResponseProcessor.threadListSerialize(decoded);
      const redecoded = GmailResponseProcessor.deserialize(reencoded).value;
      assert.deepEqual(redecoded, data.output, 're-deserialize test');
    });

    it('suggestions', function() {
      const data = loadJSON('./data/gmail-response-processor/suggestions.json');

      const decoded = GmailResponseProcessor.deserialize(data.input).value;
      assert.deepEqual(decoded, data.output, 'deserialize test');

      const reencoded = GmailResponseProcessor.suggestionSerialize(decoded);
      assert.strictEqual(reencoded, data.input, 'serialize test');
    });
  });

  describe('extractThreads', function() {
    it('works', function() {
      const data = loadJSON('./data/gmail-response-processor/search-response.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);
      assert.deepEqual(threads, data.output, 'deserialize test');
    });
  });

  describe('replaceThreadsInResponse', function() {
    it('seems to work', function() {
      this.slow(100);

      const data = loadJSON('./data/gmail-response-processor/search-response.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it('works with small number of threads', function() {
      const data = loadJSON('./data/gmail-response-processor/search-response-small.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it('works on responses with empty last part', function() {
      const data = loadJSON('./data/gmail-response-processor/search-response-empty-last-part.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);
      assert.strictEqual(threads.length, 2);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it('can empty a response', function() {
      const data = loadJSON('./data/gmail-response-processor/search-response-small.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);
      assert.strictEqual(threads.length, 2);

      const emptied = GmailResponseProcessor.replaceThreadsInResponse(data.input, []);
      const emptiedThreads = GmailResponseProcessor.extractThreads(emptied);
      assert.strictEqual(emptiedThreads.length, 0);

      const refilled = GmailResponseProcessor.replaceThreadsInResponse(emptied, threads);
      const refilledThreads = GmailResponseProcessor.extractThreads(refilled);
      assert.deepEqual(refilledThreads, threads);
      //assert.strictEqual(refilled, data.input);
    });

    it('works on empty responses', function() {
      const data = loadJSON('./data/gmail-response-processor/search-response-empty.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);
      assert(Array.isArray(threads));
      assert.strictEqual(threads.length, 0);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);
    });

    it("works on action responses", function() {
      const data = loadJSON('./data/gmail-response-processor/search-response-archive.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);

      assert.notEqual(threads.length, 0);
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });
  });

  describe('interpretSentEmailResponse', function() {
    it('can read new thread', async function() {
      const rawResponse = await readFile(__dirname+'/data/gmail-response-processor/sent-response.txt', 'utf8');
      const response = GmailResponseProcessor.interpretSentEmailResponse(rawResponse);
      assert.strictEqual(response.messageID, '14a08f7810935cb3');
      assert.strictEqual(response.threadID, '14a08f7810935cb3');
    });

    it('can read reply', async function() {
      const rawResponse = await readFile(__dirname+'/data/gmail-response-processor/sent-response2.txt', 'utf8');
      const response = GmailResponseProcessor.interpretSentEmailResponse(rawResponse);
      assert.strictEqual(response.messageID, '14a090139a3835a4');
      assert.strictEqual(response.threadID, '14a08f7810935cb3');
    });
  });
});
