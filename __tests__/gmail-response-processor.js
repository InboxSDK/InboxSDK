/* @flow */

import _ from "lodash";
import fs from 'fs';
import RSVP from '../test/lib/rsvp';
const readFile = RSVP.denodeify((fs:any).readFile.bind(fs));

import * as GmailResponseProcessor from '../src/platform-implementation-js/dom-driver/gmail/gmail-response-processor';

function readJSONnullToUndefined(filename) {
  return JSON.parse(
    fs.readFileSync(filename, 'utf8'),
    (k, v) => v == null ? undefined : v
  );
}

describe('rewriteSingleQuotes', () => {
  const r = s => GmailResponseProcessor.rewriteSingleQuotes(s);

  it('basic', () => {
    expect(r('\'ab\'')).toBe('"ab"');
  });
  it('double quote escape', () => {
    expect(r('\'a"b\'')).toBe('"a\\"b"');
    expect(r('.\'a"b\'')).toBe('."a\\"b"');
  });
  it('nop', () => {
    expect(r('"a\\"b"')).toBe('"a\\"b"');
  });
  it("check double quote surrounded by single quotes (in double quote parts) isn't escaped", () => {
    expect(r('"a\\"b\'c"d"\'e"')).toBe('"a\\"b\'c"d"\'e"');
  });
  it('escape testing', () => {
    expect(r('"a\\\\\\\\\\"b"')).toBe('"a\\\\\\\\\\"b"');
    expect(r('\'a\\\\\\\\"b\'')).toBe('"a\\\\\\\\\\"b"');
  });
  it('escaped single quote in single quotes is unescaped', () => {
    expect(r("'\\'a'")).toBe('"\'a"');
  });
});

describe('deserializeArray', () => {
  it('handles quotes', () => {
    const input = `["a'\\"123[,,]",'\\'"123[,,]',456,[3\n]]`;
    const decoded = GmailResponseProcessor.deserializeArray(input);
    expect(decoded).toEqual(["a'\"123[,,]",'\'"123[,,]',456,[3]]);
  });

  it('handles implied nulls', () => {
    const input = `[5,'a',,,6]`;
    const decoded = GmailResponseProcessor.deserializeArray(input);

    const expected = [5,'a',,,6];
    expect(decoded).toEqual(expected);
  });
});

describe('serialization', () => {
  it('message send response', () => {
    const data = readJSONnullToUndefined(__dirname+'/gmail-response-processor/send-response.json');

    const {value: decoded, options} = GmailResponseProcessor.deserialize(data.input);
    expect(decoded).toEqual(data.output);

    const reencoded = GmailResponseProcessor.serialize(decoded, options);
    const redecoded = GmailResponseProcessor.deserialize(reencoded).value;
    expect(redecoded).toEqual(data.output);
  });

  it('suggestions', () => {
    const data = readJSONnullToUndefined(__dirname+'/gmail-response-processor/suggestions.json');

    const {value, options} = GmailResponseProcessor.deserialize(data.input);
    // This is old Gmail data, new data has this as true
    options.includeExplicitNulls = false;
    expect(value).toEqual(data.output);

    const reencoded = GmailResponseProcessor.serialize(value, options);
    expect(reencoded).toBe(data.input);
  });

  it('can deserialize huge messages', () => {
    const message = `)]}'\n\n['${_.repeat('a', 8000000)}']\n`;
    expect(message.length).toBe(8000011);

    const decoded = GmailResponseProcessor.deserialize(message).value;
    // We're just checking that we can do it without crashing. We don't really
    // care about checking the value in this test.
  });

  it('noArrayNewLines 1', () => {
    const data = require('./gmail-response-processor/search-response-new.json');
    const {value, options} = GmailResponseProcessor.deserialize(data.input);
    // This is old Gmail data, new data has this as true
    options.includeExplicitNulls = false;
    const reserialized = GmailResponseProcessor.serialize(value, options);
    expect(reserialized).toBe(data.input);
  });

  it('noArrayNewLines 2', () => {
    const data = require('./gmail-response-processor/search-response-archive2.json');
    const {value, options} = GmailResponseProcessor.deserialize(data.input);
    // This is old Gmail data, new data has this as true
    options.includeExplicitNulls = false;
    const reserialized = GmailResponseProcessor.serialize(value, options);
    expect(reserialized).toBe(data.input);
  });

  it('works on one-chunk message', () => {
    const data = require('./gmail-response-processor/one-chunk-message.json');
    const {value, options} = GmailResponseProcessor.deserialize(data.input);
    // This is old Gmail data, new data has this as true
    options.includeExplicitNulls = false;
    const reserialized = GmailResponseProcessor.serialize(value, options);
    expect(reserialized).toBe(data.input);
  });

  it('works with explicit nulls', () => {
    const data = require('./gmail-response-processor/thread-list-response-with-nulls.json');
    const {value, options} = GmailResponseProcessor.deserialize(data);
    const reserialized = GmailResponseProcessor.serialize(value, options);
    expect(reserialized).toBe(data);
  });
});

describe('readDraftId', () => {
  it("works on standalone response", () => {
    const data = require('./gmail-response-processor/draft-response.json');
    const draftId = GmailResponseProcessor.readDraftId(data.input, '15183c01ef55eefe');
    expect(draftId).toBe('1520030853245562622');
  });

  it("works on reply response", () => {
    const data = require('./gmail-response-processor/draft-reply-response.json');
    const draftId = GmailResponseProcessor.readDraftId(data.input, '1518401ace55c655');
    expect(draftId).toBe('1520035358112597589');
  });
});

describe('extractThreads', () => {
  it('works', () => {
    const data = require('./gmail-response-processor/search-response.json');
    const threads = GmailResponseProcessor.extractThreads(data.input);
    expect(threads).toEqual(data.output);
  });
});

describe('extractMessageIdsFromThreadBatchRequest', () => {
  it('works', () => {
    const data = require('./gmail-response-processor/batch-thread-response.json');
    const results = GmailResponseProcessor.extractMessageIdsFromThreadBatchRequest(data);
    expect(results).toEqual({
      "15b687e66fbea0d2": "15b687ed739cae6c"
    });
  });
});

describe('extractGmailThreadIdFromMessageIdSearch', () => {
  it('works', () => {
    const data = require('./gmail-response-processor/message-id-search-response.json');
    const results = GmailResponseProcessor.extractGmailThreadIdFromMessageIdSearch(data);
    expect(results).toBe('15ca89549b92098b');
  });
});

describe('replaceThreadsInResponse', () => {
  it('seems to work', () => {
    const data = require('./gmail-response-processor/search-response.json');

    {
      // Test data is historic. Reserialize to get explicit nulls
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      data.input = GmailResponseProcessor.serialize(value, options);
    }

    const threads = GmailResponseProcessor.extractThreads(data.input);

    expect(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0})).toBe(data.input);

    // swap two threads
    threads.push(threads.shift());
    const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0});
    expect(swapped).not.toBe(data.input);
    expect(GmailResponseProcessor.extractThreads(swapped)).toEqual(threads);

    // put them back
    threads.unshift(threads.pop());
    expect(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads, {start:0})).toEqual(data.input);
  });

  it('works with small number of threads', () => {
    const data = require('./gmail-response-processor/search-response-small.json');

    {
      // Test data is historic. Reserialize to get explicit nulls
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      data.input = GmailResponseProcessor.serialize(value, options);
    }

    const threads = GmailResponseProcessor.extractThreads(data.input);

    expect(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0})).toEqual(data.input);

    // swap two threads
    threads.push(threads.shift());
    const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0});
    expect(swapped).not.toBe(data.input);
    expect(GmailResponseProcessor.extractThreads(swapped)).toEqual(threads);

    // put them back
    threads.unshift(threads.pop());
    expect(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads, {start:0})).toBe(data.input);
  });

  it('works on responses with empty last part', () => {
    const data = require('./gmail-response-processor/search-response-empty-last-part.json');

    {
      // Test data is historic. Reserialize to get explicit nulls
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      data.input = GmailResponseProcessor.serialize(value, options);
    }

    const threads = GmailResponseProcessor.extractThreads(data.input);
    expect(threads.length).toBe(2);

    expect(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0})).toBe(data.input);

    // swap two threads
    threads.push(threads.shift());
    const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0});
    expect(swapped).not.toBe(data.input);
    expect(GmailResponseProcessor.extractThreads(swapped)).toEqual(threads);

    // put them back
    threads.unshift(threads.pop());
    expect(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads, {start:0})).toBe(data.input);
  });

  it('can empty a response', () => {
    const data = require('./gmail-response-processor/search-response-small.json');

    {
      // Test data is historic. Reserialize to get explicit nulls
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      data.input = GmailResponseProcessor.serialize(value, options);
    }

    const threads = GmailResponseProcessor.extractThreads(data.input);
    expect(threads.length).toBe(2);

    const emptied = GmailResponseProcessor.replaceThreadsInResponse(data.input, [], {start:0});
    const emptiedThreads = GmailResponseProcessor.extractThreads(emptied);
    expect(emptiedThreads.length).toBe(0);
  });

  it('works on empty responses', () => {
    const data = require('./gmail-response-processor/search-response-empty.json');

    {
      // Test data is historic. Reserialize to get explicit nulls
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      data.input = GmailResponseProcessor.serialize(value, options);
    }

    const threads = GmailResponseProcessor.extractThreads(data.input);
    expect(Array.isArray(threads)).toBe(true);
    expect(threads.length).toBe(0);

    expect(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0})).toBe(data.input);
  });

  it('respects start parameter', () => {
    const dataWithStart0 = require('./gmail-response-processor/search-response-start-0.json');
    const dataWithStart50 = require('./gmail-response-processor/search-response-start-50.json');

    const serializedWithStart0 = GmailResponseProcessor.serialize(dataWithStart0, {
      includeLengths: true,
      noArrayNewLines: true,
      suggestionMode: false,
      includeExplicitNulls: true
    });
    const serializedWithStart50 = GmailResponseProcessor.serialize(dataWithStart50, {
      includeLengths: true,
      noArrayNewLines: true,
      suggestionMode: false,
      includeExplicitNulls: true
    });

    const threadsWithStart0 = GmailResponseProcessor.extractThreads(serializedWithStart0);
    const threadsWithStart50 = GmailResponseProcessor.extractThreads(serializedWithStart50);

    expect(threadsWithStart0.length).toBe(1);
    expect(threadsWithStart50.length).toBe(1);

    expect(GmailResponseProcessor.replaceThreadsInResponse(
      serializedWithStart50,
      threadsWithStart50,
      {start: 50}
    )).toBe(serializedWithStart50);

    expect(GmailResponseProcessor.replaceThreadsInResponse(
      serializedWithStart0,
      threadsWithStart0,
      {start: 50}
    )).toBe(serializedWithStart50);

    expect(GmailResponseProcessor.replaceThreadsInResponse(
      serializedWithStart50,
      threadsWithStart50,
      {start: 0}
    )).toBe(serializedWithStart0);
  });

  it('respects total parameter', () => {
    const dataWithTotal1 = require('./gmail-response-processor/search-response-total-1.json');
    const dataWithTotal50 = require('./gmail-response-processor/search-response-total-50.json');
    const dataWithTotalMany = require('./gmail-response-processor/search-response-total-many.json');

    const serializedWithTotal1 = GmailResponseProcessor.serialize(dataWithTotal1, {
      includeLengths: true,
      noArrayNewLines: true,
      suggestionMode: false,
      includeExplicitNulls: true
    });
    const serializedWithTotal50 = GmailResponseProcessor.serialize(dataWithTotal50, {
      includeLengths: true,
      noArrayNewLines: true,
      suggestionMode: false,
      includeExplicitNulls: true
    });
    const serializedWithTotalMany = GmailResponseProcessor.serialize(dataWithTotalMany, {
      includeLengths: true,
      noArrayNewLines: true,
      suggestionMode: false,
      includeExplicitNulls: true
    });

    const threadsWithTotal1 = GmailResponseProcessor.extractThreads(serializedWithTotal1);
    const threadsWithTotal50 = GmailResponseProcessor.extractThreads(serializedWithTotal50);
    const threadsWithTotalMany = GmailResponseProcessor.extractThreads(serializedWithTotalMany);

    expect(threadsWithTotal1.length).toBe(1);
    expect(threadsWithTotal50.length).toBe(1);
    expect(threadsWithTotalMany.length).toBe(1);

    expect(GmailResponseProcessor.replaceThreadsInResponse(
      serializedWithTotal1,
      threadsWithTotal1,
      {start: 0, total: 1}
    )).toBe(serializedWithTotal1);

    expect(GmailResponseProcessor.replaceThreadsInResponse(
      serializedWithTotal1,
      threadsWithTotal1,
      {start: 0, total: 50}
    )).toBe(serializedWithTotal50);

    expect(GmailResponseProcessor.replaceThreadsInResponse(
      serializedWithTotal50,
      threadsWithTotal50,
      {start: 0, total: 1}
    )).toBe(serializedWithTotal1);

    // We only care about the number -> 'MANY' conversion because we currently
    // only process responses with a finite count. The 'MANY' -> number
    // conversion is not supported.
    expect(GmailResponseProcessor.replaceThreadsInResponse(
      serializedWithTotal50,
      threadsWithTotal50,
      {start: 0, total: 'MANY'}
    )).toBe(serializedWithTotalMany);
  });

  it("works on action responses", () => {
    const data = require('./gmail-response-processor/search-response-archive.json');

    {
      // Test data is historic. Reserialize to get explicit nulls
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      data.input = GmailResponseProcessor.serialize(value, options);
    }

    const threads = GmailResponseProcessor.extractThreads(data.input);

    expect(threads.length).not.toBe(0);
    expect(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0})).toBe(data.input);

    // swap two threads
    threads.push(threads.shift());
    const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0});
    expect(swapped).not.toBe(data.input);
    expect(GmailResponseProcessor.extractThreads(swapped)).toEqual(threads);

    // put them back
    threads.unshift(threads.pop());
    expect(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads, {start:0})).toBe(data.input);
  });

  it("works on newer response", () => {
    const data = require('./gmail-response-processor/search-response-new.json');

    {
      // Test data is historic. Reserialize to get explicit nulls
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      data.input = GmailResponseProcessor.serialize(value, options);
    }

    const threads = GmailResponseProcessor.extractThreads(data.input);
    expect(threads.length).toBe(1);

    const replaced = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0});
    expect(GmailResponseProcessor.extractThreads(replaced).length).toBe(1);
    expect(replaced).toBe(data.input);
  });

  it("works on newer action responses", () => {
    const data = require('./gmail-response-processor/search-response-archive2.json');

    {
      // Test data is historic. Reserialize to get explicit nulls
      const {value, options} = GmailResponseProcessor.deserialize(data.input);
      data.input = GmailResponseProcessor.serialize(value, options);
    }

    const threads = GmailResponseProcessor.extractThreads(data.input);

    expect(threads.length).not.toBe(0);
    expect(GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0})).toBe(data.input);

    // swap two threads
    threads.push(threads.shift());
    const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, threads, {start:0});
    expect(swapped).not.toBe(data.input);
    expect(GmailResponseProcessor.extractThreads(swapped)).toEqual(threads);

    // put them back
    threads.unshift(threads.pop());
    expect(GmailResponseProcessor.replaceThreadsInResponse(swapped, threads, {start:0})).toBe(data.input);
  });

  it("fixes the end marker's section count", () => {
    const data = require('./gmail-response-processor/search-response-small.json');
    {
      const deserialized = GmailResponseProcessor.deserialize(data.input).value;
      const endSection = _.last(_.last(deserialized));
      expect(endSection[0]).toBe('e');
      expect(endSection[1]).toBe(12);
    }

    const threads = GmailResponseProcessor.extractThreads(data.input);
    expect(threads.length).toBe(2);

    // Gmail responses have sections of 10 thread rows each.
    // Replace the 2 threads with 12 threads, so that we add a new section.

    const moreThreads = _.chain()
      .range(6)
      .map(() => threads)
      .flatten()
      .value();
    expect(moreThreads.length).toBe(12);

    const swapped = GmailResponseProcessor.replaceThreadsInResponse(data.input, moreThreads, {start:0});
    expect(GmailResponseProcessor.extractThreads(swapped)).toEqual(moreThreads);

    {
      const deserialized = GmailResponseProcessor.deserialize(swapped).value;
      const endSection = _.last(_.last(deserialized));
      expect(endSection[0]).toBe('e');
      expect(endSection[1]).toBe(13);
    }
  });
});

describe('interpretSentEmailResponse', () => {
  it('can read new thread', async () => {
    const rawResponse = await readFile(__dirname+'/gmail-response-processor/sent-response.txt', 'utf8');
    const response = GmailResponseProcessor.interpretSentEmailResponse(rawResponse);
    expect(response.messageID).toBe('14a08f7810935cb3');
    expect(response.threadID).toBe('14a08f7810935cb3');
  });

  it('can read reply', async () => {
    const rawResponse = await readFile(__dirname+'/gmail-response-processor/sent-response2.txt', 'utf8');
    const response = GmailResponseProcessor.interpretSentEmailResponse(rawResponse);
    expect(response.messageID).toBe('14a090139a3835a4');
    expect(response.threadID).toBe('14a08f7810935cb3');
  });
});
