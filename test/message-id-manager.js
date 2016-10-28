/* @flow */

import assert from 'assert';
import sinon from 'sinon';
import RSVP from './lib/rsvp';
import delay from 'pdelay';
import MockStorage from 'mock-webstorage';

import MessageIdManager from '../src/platform-implementation-js/lib/message-id-manager';

describe("MessageIdManager", function() {
  it("return value from getGmailThreadIdForRfcMessageId is cached", async function() {
    const storage: Object = new MockStorage();
    const getGmailThreadIdForRfcMessageId = sinon.stub().returns(RSVP.Promise.resolve("123"));
    const mim = new MessageIdManager({
      getGmailThreadIdForRfcMessageId,
      getRfcMessageIdForGmailMessageId(mid) {
        throw new Error("should not happen");
      },
      storage, saveThrottle: 2
    });

    const startTime = Date.now();
    assert.strictEqual(storage.length, 0);
    assert.strictEqual(await mim.getGmailThreadIdForRfcMessageId("<123>"), "123");
    assert.strictEqual(await mim.getGmailThreadIdForRfcMessageId("<123>"), "123");
    assert.strictEqual(await mim.getRfcMessageIdForGmailThreadId("123"), "<123>");
    assert(getGmailThreadIdForRfcMessageId.calledOnce);
    await delay(20);
    const endTime = Date.now();

    assert.strictEqual(storage.length, 1);
    const cachedThreadIds = JSON.parse(storage.getItem("inboxsdk__cached_thread_ids"));
    assert.strictEqual(cachedThreadIds.length, 1);
    assert.strictEqual(cachedThreadIds[0].length, 3);
    assert.strictEqual(cachedThreadIds[0][0], "<123>");
    assert.strictEqual(cachedThreadIds[0][1], "123");
    assert.strictEqual(typeof cachedThreadIds[0][2], "number");
    assert(startTime <= cachedThreadIds[0][2] && cachedThreadIds[0][2] <= endTime);
  });

  it("return value from getRfcMessageIdForGmailMessageId is cached", async function() {
    const storage: Object = new MockStorage();
    const getRfcMessageIdForGmailMessageId = sinon.stub().returns(RSVP.Promise.resolve("<456>"));
    const mim = new MessageIdManager({
      getGmailThreadIdForRfcMessageId(rfcId) {
        throw new Error("should not happen");
      },
      getRfcMessageIdForGmailMessageId,
      storage, saveThrottle: 2
    });

    const startTime = Date.now();
    assert.strictEqual(storage.length, 0);
    assert.strictEqual(await mim.getRfcMessageIdForGmailThreadId("456"), "<456>");
    assert.strictEqual(await mim.getRfcMessageIdForGmailThreadId("456"), "<456>");
    assert.strictEqual(await mim.getGmailThreadIdForRfcMessageId("<456>"), "456");
    assert(getRfcMessageIdForGmailMessageId.calledOnce);
    await delay(20);
    const endTime = Date.now();

    assert.strictEqual(storage.length, 1);
    const cachedThreadIds = JSON.parse(storage.getItem("inboxsdk__cached_thread_ids"));
    assert.strictEqual(cachedThreadIds.length, 1);
    assert.strictEqual(cachedThreadIds[0].length, 3);
    assert.strictEqual(cachedThreadIds[0][0], "<456>");
    assert.strictEqual(cachedThreadIds[0][1], "456");
    assert.strictEqual(typeof cachedThreadIds[0][2], "number");
    assert(startTime <= cachedThreadIds[0][2] && cachedThreadIds[0][2] <= endTime);
  });

  it("can load from storage", async function() {
    const storage: Object = new MockStorage();
    storage.setItem("inboxsdk__cached_thread_ids", JSON.stringify([["<789>", "789", Date.now()]]));
    const mim = new MessageIdManager({
      getGmailThreadIdForRfcMessageId(rfcId) {
        throw new Error("should not happen");
      },
      getRfcMessageIdForGmailMessageId(mid) {
        throw new Error("should not happen");
      },
      storage, saveThrottle: 2
    });
    assert.strictEqual(await mim.getRfcMessageIdForGmailThreadId("789"), "<789>");
    assert.strictEqual(await mim.getGmailThreadIdForRfcMessageId("<789>"), "789");
  });
});
