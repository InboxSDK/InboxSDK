/* @flow */

import delay from 'pdelay';
import MockStorage from 'mock-webstorage';

import BiMapCache from './BiMapCache';

test("return value from getBfromA is cached", async () => {
  const storage: Object = new MockStorage();
  const getBfromA = jest.fn(() => Promise.resolve("123"));
  const mim = new BiMapCache({
    key: "xyz",
    getAfromB(b) {
      throw new Error("should not happen");
    },
    getBfromA,
    storage, saveThrottle: 2
  });

  const startTime = Date.now();
  expect(storage.length).toBe(0);
  expect(await mim.getBfromA("<123>")).toBe("123");
  expect(await mim.getBfromA("<123>")).toBe("123");
  expect(await mim.getAfromB("123")).toBe("<123>");
  expect(getBfromA).toHaveBeenCalledTimes(1);
  await delay(20);
  const endTime = Date.now();

  expect(storage.length).toBe(1);
  const cachedThreadIds = JSON.parse(storage.getItem("xyz")).ids;
  expect(cachedThreadIds.length).toBe(1);
  expect(cachedThreadIds[0].length).toBe(3);
  expect(cachedThreadIds[0][0]).toBe("<123>");
  expect(cachedThreadIds[0][1]).toBe("123");
  expect(typeof cachedThreadIds[0][2]).toBe("number");
  expect(startTime).toBeLessThanOrEqual(cachedThreadIds[0][2]);
  expect(cachedThreadIds[0][2]).toBeLessThanOrEqual(endTime);
});

test("return value from getAfromB is cached", async () => {
  const storage: Object = new MockStorage();
  const getAfromB = jest.fn(() => Promise.resolve("<456>"));
  const mim = new BiMapCache({
    key: "xyz",
    getAfromB,
    getBfromA(a) {
      throw new Error("should not happen");
    },
    storage, saveThrottle: 2
  });

  const startTime = Date.now();
  expect(storage.length).toBe(0);
  expect(await mim.getAfromB("456")).toBe("<456>");
  expect(await mim.getAfromB("456")).toBe("<456>");
  expect(await mim.getBfromA("<456>")).toBe("456");
  expect(getAfromB).toHaveBeenCalledTimes(1);
  await delay(20);
  const endTime = Date.now();

  expect(storage.length).toBe(1);
  const cachedThreadIds = JSON.parse(storage.getItem("xyz")).ids;
  expect(cachedThreadIds.length).toBe(1);
  expect(cachedThreadIds[0].length).toBe(3);
  expect(cachedThreadIds[0][0]).toBe("<456>");
  expect(cachedThreadIds[0][1]).toBe("456");
  expect(typeof cachedThreadIds[0][2]).toBe("number");
  expect(startTime).toBeLessThanOrEqual(cachedThreadIds[0][2]);
  expect(cachedThreadIds[0][2]).toBeLessThanOrEqual(endTime);
});

test("can load from storage", async () => {
  const storage: Object = new MockStorage();
  storage.setItem("xyz", JSON.stringify({version: 2, ids: [["<789>", "789", Date.now()]]}));
  const mim = new BiMapCache({
    key: "xyz",
    getAfromB(b) {
      throw new Error("should not happen");
    },
    getBfromA(a) {
      throw new Error("should not happen");
    },
    storage, saveThrottle: 2
  });
  expect(await mim.getAfromB("789")).toBe("<789>");
  expect(await mim.getBfromA("<789>")).toBe("789");
});

test("maxAge", async () => {
  const _DateNow = Date.now;
  try {
    const storage: Object = new MockStorage();

    {
      let i = 0;
      const mim = new BiMapCache({
        key: "xyz",
        async getAfromB(b) {
          return `${b}:${i++}`;
        },
        getBfromA(a) {
          throw new Error("should not happen");
        },
        storage, saveThrottle: 2, maxAge: 1000*60*60*24*365 // one year
      });
      expect(await mim.getAfromB("a")).toBe("a:0");
      expect(await mim.getAfromB("b")).toBe("b:1");
      expect(await mim.getAfromB("c")).toBe("c:2");
      (Date:any).now = () => _DateNow.call(Date) + 2*1000*60*60*24*365; // two years
      expect(await mim.getAfromB("d")).toBe("d:3");
      expect(await mim.getAfromB("e")).toBe("e:4");
      await delay(20);
    }

    {
      const mim = new BiMapCache({
        key: "xyz",
        async getAfromB(b) {
          return 'notcached';
        },
        getBfromA(a) {
          throw new Error("should not happen");
        },
        storage, saveThrottle: 2, maxAge: 1000*60*60*24*365 // one year
      });
      expect(await mim.getAfromB("a")).toBe("notcached");
      expect(await mim.getAfromB("b")).toBe("notcached");
      expect(await mim.getAfromB("c")).toBe("notcached");
      expect(await mim.getAfromB("d")).toBe("d:3");
      expect(await mim.getAfromB("e")).toBe("e:4");
    }
  } finally {
    (Date:any).now = _DateNow;
  }
});

test("maxLimit", async () => {
  const storage: Object = new MockStorage();

  {
    let i = 0;
    const mim = new BiMapCache({
      key: "xyz",
      async getAfromB(b) {
        return `${b}:${i++}`;
      },
      getBfromA(a) {
        throw new Error("should not happen");
      },
      storage, saveThrottle: 2, maxLimit: 3
    });
    expect(await mim.getAfromB("a")).toBe("a:0");
    expect(await mim.getAfromB("b")).toBe("b:1");
    expect(await mim.getAfromB("c")).toBe("c:2");
    expect(await mim.getAfromB("d")).toBe("d:3");
    expect(await mim.getAfromB("e")).toBe("e:4");
    await delay(20);
  }

  {
    const mim = new BiMapCache({
      key: "xyz",
      async getAfromB(b) {
        return 'notcached';
      },
      getBfromA(a) {
        throw new Error("should not happen");
      },
      storage, saveThrottle: 2, maxLimit: 3
    });
    expect(await mim.getAfromB("a")).toBe("notcached");
    expect(await mim.getAfromB("b")).toBe("notcached");
    expect(await mim.getAfromB("c")).toBe("c:2");
    expect(await mim.getAfromB("d")).toBe("d:3");
    expect(await mim.getAfromB("e")).toBe("e:4");
  }
});

test("simultaneous calls with same value result in one call", async () => {
  const storage: Object = new MockStorage();
  let resolve;
  const promise = new Promise(_resolve => {
    resolve = _resolve;
  });
  if (!resolve) throw new Error();

  let i = 0;
  const mim = new BiMapCache({
    key: "xyz",
    async getAfromB(b) {
      const s = `${b}:${i++}`;
      await promise;
      return s;
    },
    getBfromA(a) {
      throw new Error("should not happen");
    },
    storage, saveThrottle: 2
  });

  let a1, a2, b1;
  mim.getAfromB("a").then(result => {
    a1 = result;
  });
  mim.getAfromB("a").then(result => {
    a2 = result;
  });
  mim.getAfromB("b").then(result => {
    b1 = result;
  });
  await delay(5);
  expect(a1).toBe(undefined);
  expect(a2).toBe(undefined);
  expect(b1).toBe(undefined);
  resolve();
  await delay(5);
  expect(a1).toBe("a:0");
  expect(a2).toBe("a:0");
  expect(b1).toBe("b:1");

  expect(await mim.getBfromA("a:0")).toBe("a");
  expect(await mim.getAfromB("b")).toBe("b:1");
});
