/* @flow */

import delay from 'pdelay';
import MockStorage from 'mock-webstorage';

import MessageIdManager from './message-id-manager';

test("return value from getGmailThreadIdForRfcMessageId is cached", async function() {
  const storage: Object = new MockStorage();
  const getGmailThreadIdForRfcMessageId = jest.fn(() => Promise.resolve("123"));
  const mim = new MessageIdManager({
    getGmailThreadIdForRfcMessageId,
    getRfcMessageIdForGmailMessageId(mid) {
      throw new Error("should not happen");
    },
    storage, saveThrottle: 2
  });

  const startTime = Date.now();
  expect(storage.length).toBe(0);
  expect(await mim.getGmailThreadIdForRfcMessageId("<123>")).toBe("123");
  expect(await mim.getGmailThreadIdForRfcMessageId("<123>")).toBe("123");
  expect(await mim.getRfcMessageIdForGmailThreadId("123")).toBe("<123>");
  expect(getGmailThreadIdForRfcMessageId).toHaveBeenCalledTimes(1);
  await delay(20);
  const endTime = Date.now();

  expect(storage.length).toBe(1);
  const cachedThreadIds = JSON.parse(storage.getItem("inboxsdk__cached_thread_ids"));
  expect(cachedThreadIds.length).toBe(1);
  expect(cachedThreadIds[0].length).toBe(3);
  expect(cachedThreadIds[0][0]).toBe("<123>");
  expect(cachedThreadIds[0][1]).toBe("123");
  expect(typeof cachedThreadIds[0][2]).toBe("number");
  expect(startTime).toBeLessThanOrEqual(cachedThreadIds[0][2]);
  expect(cachedThreadIds[0][2]).toBeLessThanOrEqual(endTime);
});

test("return value from getRfcMessageIdForGmailMessageId is cached", async function() {
  const storage: Object = new MockStorage();
  const getRfcMessageIdForGmailMessageId = jest.fn(() => Promise.resolve("<456>"));
  const mim = new MessageIdManager({
    getGmailThreadIdForRfcMessageId(rfcId) {
      throw new Error("should not happen");
    },
    getRfcMessageIdForGmailMessageId,
    storage, saveThrottle: 2
  });

  const startTime = Date.now();
  expect(storage.length).toBe(0);
  expect(await mim.getRfcMessageIdForGmailThreadId("456")).toBe("<456>");
  expect(await mim.getRfcMessageIdForGmailThreadId("456")).toBe("<456>");
  expect(await mim.getGmailThreadIdForRfcMessageId("<456>")).toBe("456");
  expect(getRfcMessageIdForGmailMessageId).toHaveBeenCalledTimes(1);
  await delay(20);
  const endTime = Date.now();

  expect(storage.length).toBe(1);
  const cachedThreadIds = JSON.parse(storage.getItem("inboxsdk__cached_thread_ids"));
  expect(cachedThreadIds.length).toBe(1);
  expect(cachedThreadIds[0].length).toBe(3);
  expect(cachedThreadIds[0][0]).toBe("<456>");
  expect(cachedThreadIds[0][1]).toBe("456");
  expect(typeof cachedThreadIds[0][2]).toBe("number");
  expect(startTime).toBeLessThanOrEqual(cachedThreadIds[0][2]);
  expect(cachedThreadIds[0][2]).toBeLessThanOrEqual(endTime);
});

test("can load from storage", async function() {
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
  expect(await mim.getRfcMessageIdForGmailThreadId("789")).toBe("<789>");
  expect(await mim.getGmailThreadIdForRfcMessageId("<789>")).toBe("789");
});
