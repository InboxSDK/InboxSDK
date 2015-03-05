import assert from 'assert';
import co from 'co';
import sinon from 'sinon';
import RSVP from './lib/rsvp';
import delay from '../src/common/delay';
import MockStorage from './lib/mock-storage';

import MessageIdManager from '../src/platform-implementation-js/lib/message-id-manager';

describe("MessageIdManager", function() {
  it("return value from getGmailThreadIdForRfcMessageId is cached", co.wrap(function*() {
    const storage = new MockStorage();
    const getGmailThreadIdForRfcMessageId = sinon.stub().returns(RSVP.Promise.resolve("123"));
    const mim = new MessageIdManager({
      getGmailThreadIdForRfcMessageId,
      getRfcMessageIdForGmailMessageId(mid) {
        throw new Error("should not happen");
      },
      storage, saveThrottle: 2
    });

    const startTime = Date.now();
    assert.strictEqual(yield mim.getGmailThreadIdForRfcMessageId("<123>"), "123");
    assert.strictEqual(yield mim.getGmailThreadIdForRfcMessageId("<123>"), "123");
    assert.strictEqual(yield mim.getRfcMessageIdForGmailThreadId("123"), "<123>");
    assert.strictEqual(storage.length, 0);
    assert(getGmailThreadIdForRfcMessageId.calledOnce);
    yield delay(2);
    const endTime = Date.now();

    assert.strictEqual(storage.length, 1);
    const cachedThreadIds = JSON.parse(storage.getItem("inboxsdk__cached_thread_ids"));
    assert.strictEqual(cachedThreadIds.length, 1);
    assert.strictEqual(cachedThreadIds[0].length, 3);
    assert.strictEqual(cachedThreadIds[0][0], "<123>");
    assert.strictEqual(cachedThreadIds[0][1], "123");
    assert.strictEqual(typeof cachedThreadIds[0][2], "number");
    assert(startTime <= cachedThreadIds[0][2] && cachedThreadIds[0][2] <= endTime);
  }));

  it("return value from getRfcMessageIdForGmailMessageId is cached", co.wrap(function*() {
    const storage = new MockStorage();
    const getRfcMessageIdForGmailMessageId = sinon.stub().returns(RSVP.Promise.resolve("<456>"));
    const mim = new MessageIdManager({
      getGmailThreadIdForRfcMessageId(rfcId) {
        throw new Error("should not happen");
      },
      getRfcMessageIdForGmailMessageId,
      storage, saveThrottle: 2
    });

    const startTime = Date.now();
    assert.strictEqual(yield mim.getRfcMessageIdForGmailThreadId("456"), "<456>");
    assert.strictEqual(yield mim.getRfcMessageIdForGmailThreadId("456"), "<456>");
    assert.strictEqual(yield mim.getGmailThreadIdForRfcMessageId("<456>"), "456");
    assert.strictEqual(storage.length, 0);
    assert(getRfcMessageIdForGmailMessageId.calledOnce);
    yield delay(2);
    const endTime = Date.now();

    assert.strictEqual(storage.length, 1);
    const cachedThreadIds = JSON.parse(storage.getItem("inboxsdk__cached_thread_ids"));
    assert.strictEqual(cachedThreadIds.length, 1);
    assert.strictEqual(cachedThreadIds[0].length, 3);
    assert.strictEqual(cachedThreadIds[0][0], "<456>");
    assert.strictEqual(cachedThreadIds[0][1], "456");
    assert.strictEqual(typeof cachedThreadIds[0][2], "number");
    assert(startTime <= cachedThreadIds[0][2] && cachedThreadIds[0][2] <= endTime);
  }));

  it("can load from storage", co.wrap(function*() {
    const storage = new MockStorage();
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
    assert.strictEqual(yield mim.getRfcMessageIdForGmailThreadId("789"), "<789>");
    assert.strictEqual(yield mim.getGmailThreadIdForRfcMessageId("<789>"), "789");
  }));
});
