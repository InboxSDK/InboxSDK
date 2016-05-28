/* @flow */
//jshint ignore:start

import assert from "assert";
import _ from "lodash";
import fs from 'fs';
import RSVP from './lib/rsvp';
const readFile = RSVP.denodeify((fs:any).readFile.bind(fs));
import co from 'co';

import * as GmailResponseProcessor from '../src/platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import disallowEval from './lib/disallow-eval';

function readJSONnullToUndefined(filename) {
  return JSON.parse(
    fs.readFileSync(filename, 'utf8'),
    (k, v) => v == null ? undefined : v
  );
}

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
      assert.strictEqual(r("'\\'a'"), '"\'a"',
        'escaped single quote in single quotes is unescaped');
    });
  });

  describe('deserializeArray', function() {
    it('handles quotes', function() {
      const input = `["a'\\"123[,,]",'\\'"123[,,]',456,[3\n]]`;
      const decoded = GmailResponseProcessor.deserializeArray(input);
      assert.deepEqual(decoded, ["a'\"123[,,]",'\'"123[,,]',456,[3]]);
    });

    it('handles implied nulls', function() {
      const input = `[5,'a',,,6]`;
      const decoded = GmailResponseProcessor.deserializeArray(input);

      const expected = [5,'a',,,6];
      assert.strictEqual(decoded.length, expected.length);
      for (let i=0; i < expected.length; i++) {
        assert.strictEqual(decoded[i], expected[i], `decoded[${i}]`);
      }
    });
  });

  describe('serialization', function() {
    it('message send response', function() {
      const data = readJSONnullToUndefined(__dirname+'/data/gmail-response-processor/send-response.json');

      const decoded = GmailResponseProcessor.deserialize(data.input).value;
      assert.deepEqual(decoded, data.output, 'deserialize test');

      const reencoded = GmailResponseProcessor.threadListSerialize(decoded);
      const redecoded = GmailResponseProcessor.deserialize(reencoded).value;
      assert.deepEqual(redecoded, data.output, 're-deserialize test');
    });

    it('suggestions', function() {
      const data = readJSONnullToUndefined(__dirname+'/data/gmail-response-processor/suggestions.json');

      const decoded = GmailResponseProcessor.deserialize(data.input).value;
      assert.deepEqual(decoded, data.output, 'deserialize test');

      const reencoded = GmailResponseProcessor.suggestionSerialize(decoded);
      assert.strictEqual(reencoded, data.input, 'serialize test');
    });

    it('can deserialize huge messages', function() {
      this.slow();
      const message = `)]}'\n\n['${_.repeat('a', 8000000)}']\n`;
      assert.strictEqual(message.length, 8000011);

      const decoded = GmailResponseProcessor.deserialize(message).value;
    });

    it('noArrayNewLines 1', function() {
      const data = require('./data/gmail-response-processor/search-response-new.json');
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      const reserialized = GmailResponseProcessor.serialize(value, options);
      assert.strictEqual(reserialized, data.input);
    });

    it('noArrayNewLines 2', function() {
      const data = require('./data/gmail-response-processor/search-response-archive2.json');
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      const reserialized = GmailResponseProcessor.serialize(value, options);
      assert.strictEqual(reserialized, data.input);
    });

    it('works on one-chunk message', function() {
      const data = require('./data/gmail-response-processor/one-chunk-message.json');
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      const reserialized = GmailResponseProcessor.serialize(value, options);
      assert.strictEqual(reserialized, data.input);
    });
  });

  describe('readDraftId', function() {
    it("works on standalone response", function() {
      const data = require('./data/gmail-response-processor/draft-response.json');
      const draftId = GmailResponseProcessor.readDraftId(data.input, '15183c01ef55eefe');
      assert.strictEqual(draftId, '1520030853245562622');
    });

    it("works on reply response", function() {
      const data = require('./data/gmail-response-processor/draft-reply-response.json');
      const draftId = GmailResponseProcessor.readDraftId(data.input, '1518401ace55c655');
      assert.strictEqual(draftId, '1520035358112597589');
    });
  });

  describe('extractThreads', function() {
    it('works', function() {
      const data = require('./data/gmail-response-processor/search-response.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);
      assert.deepEqual(threads, data.output, 'deserialize test');
    });
  });

  describe('replaceThreadsInResponse', function() {
    it('seems to work', function() {
      this.slow(100);

      const data = require('./data/gmail-response-processor/search-response.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);
      assert.deepEqual(GmailResponseProcessor.extractThreads(swapped), threads);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it('works with small number of threads', function() {
      const data = require('./data/gmail-response-processor/search-response-small.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);
      assert.deepEqual(GmailResponseProcessor.extractThreads(swapped), threads);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it('works on responses with empty last part', function() {
      const data = require('./data/gmail-response-processor/search-response-empty-last-part.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);
      assert.strictEqual(threads.length, 2);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);
      assert.deepEqual(GmailResponseProcessor.extractThreads(swapped), threads);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it('can empty a response', function() {
      const data = require('./data/gmail-response-processor/search-response-small.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);
      assert.strictEqual(threads.length, 2);

      const emptied = GmailResponseProcessor.replaceThreadsInResponse(data.input, []);
      const emptiedThreads = GmailResponseProcessor.extractThreads(emptied);
      assert.strictEqual(emptiedThreads.length, 0);
    });

    it('works on empty responses', function() {
      const data = require('./data/gmail-response-processor/search-response-empty.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);
      assert(Array.isArray(threads));
      assert.strictEqual(threads.length, 0);

      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);
    });

    it("works on action responses", function() {
      const data = require('./data/gmail-response-processor/search-response-archive.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);

      assert.notEqual(threads.length, 0);
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);
      assert.deepEqual(GmailResponseProcessor.extractThreads(swapped), threads);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it("works on newer response", function() {
      const data = require('./data/gmail-response-processor/search-response-new.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);
      assert.strictEqual(threads.length, 1);

      const replaced = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.strictEqual(GmailResponseProcessor.extractThreads(replaced).length, 1);
      assert.strictEqual(replaced, data.input);
    });

    it("works on newer action responses", function() {
      const data = require('./data/gmail-response-processor/search-response-archive2.json');
      const threads = GmailResponseProcessor.extractThreads(data.input);

      assert.notEqual(threads.length, 0);
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads), data.input);

      // swap two threads
      threads.push(threads.shift());
      const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads);
      assert.notEqual(swapped, data.input);
      assert.deepEqual(GmailResponseProcessor.extractThreads(swapped), threads);

      // put them back
      threads.unshift(threads.pop());
      assert.strictEqual(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads), data.input);
    });

    it("fixes the end marker's section count", function() {
      const data = require('./data/gmail-response-processor/search-response-small.json');
      {
        const deserialized = GmailResponseProcessor.deserialize(data.input).value;
        const endSection = _.last(_.last(deserialized));
        assert.strictEqual(endSection[0], 'e');
        assert.strictEqual(endSection[1], 12);
      }

      const threads = GmailResponseProcessor.extractThreads(data.input);
      assert.strictEqual(threads.length, 2);

      // Gmail responses have sections of 10 thread rows each.
      // Replace the 2 threads with 12 threads, so that we add a new section.

      const moreThreads = _.chain()
        .range(6)
        .map(() => threads)
        .flatten()
        .value();
      assert.strictEqual(moreThreads.length, 12);

      const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, moreThreads);
      assert.deepEqual(GmailResponseProcessor.extractThreads(swapped), moreThreads);

      {
        const deserialized = GmailResponseProcessor.deserialize(swapped).value;
        const endSection = _.last(_.last(deserialized));
        assert.strictEqual(endSection[0], 'e');
        assert.strictEqual(endSection[1], 13);
      }
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
