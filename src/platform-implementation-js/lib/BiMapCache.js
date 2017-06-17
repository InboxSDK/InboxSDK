/* @flow */

import throttle from 'lodash/throttle';
import sortBy from 'lodash/sortBy';

export type Options<A:string|number=string,B:string|number=string> = {
  key: string;
  getAfromB(b: B): Promise<A>;
  getBfromA(a: A): Promise<B>;
  storage?: Storage;
  saveThrottle?: number;
  maxLimit?: number;
  maxAge?: number;
};

// The type parameters are mainly so Flow helps us avoid mixing up A and B.
// Generally you'll probably have them both be strings.
export default class BiMapCache<A: string|number=string,B: string|number=string> {
  _key: string;
  _getAfromB: (b: B) => Promise<A>;
  _getBfromA: (a: A) => Promise<B>;
  _storage: ?Storage;
  _aToTimestamp: Map<A, number> = new Map(); // Map containing times of last activity
  _aToB: Map<A, B> = new Map();
  _bToA: Map<B, A> = new Map();
  _aToBpromise: Map<A, Promise<B>> = new Map(); // used for de-duping in-progress lookups
  _bToApromise: Map<B, Promise<A>> = new Map();
  _saveCache: () => void;

  constructor({key, getBfromA, getAfromB, storage, saveThrottle, maxLimit, maxAge}: Options<A,B>) {
    this._key = key;
    this._getBfromA = getBfromA;
    this._getAfromB = getAfromB;
    this._storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (saveThrottle == null) {
      saveThrottle = 3000;
    }
    if (maxLimit == null) {
      maxLimit = 1000;
    }
    if (maxAge == null) {
      maxAge = 1000*60*60*24*365; // one year
    }
    const maxLimit_ = maxLimit, maxAge_ = maxAge;

    this._saveCache = throttle(() => {
      const storage = this._storage;
      if (!storage) return;
      // If there are other active BiMapCaches with the same key, then it's
      // important we load everything from storage first before overwriting it.
      this._loadCache();

      const minTimestamp = Date.now() - maxAge_;

      const item = {version: 2, ids: []};
      this._aToB.forEach((b, a) => {
        const timestamp = this._aToTimestamp.get(a);
        if (timestamp != null && timestamp > minTimestamp) {
          item.ids.push([a, b, timestamp]);
        }
      });
      if (item.ids.length > maxLimit_) {
        item.ids = sortBy(item.ids, ([a, b, timestamp]) => timestamp)
          .slice(-maxLimit_);
      }
      storage.setItem(this._key, JSON.stringify(item));
    }, saveThrottle, {leading:false});

    this._loadCache();
  }

  _loadCache() {
    const storage = this._storage;
    if (!storage) return;
    try {
      let item = JSON.parse(storage.getItem(this._key)||'null');
      if (!item || item.version !== 2) return;
      for (let x of item.ids) {
        const [a, b, timestamp] = x;
        this._aToTimestamp.set(a, timestamp);
        this._aToB.set(a, b);
        this._bToA.set(b, a);
      }
    } catch(e) {
      console.error('failed to load BiMapCache from storage', e);
    }
  }

  _rememberPair(a: A, b: B) {
    this._aToTimestamp.set(a, Date.now());
    this._aToB.set(a, b);
    this._bToA.set(b, a);
    this._saveCache();
  }

  _update(a: A) {
    this._aToTimestamp.set(a, Date.now());
    this._saveCache();
  }

  getBfromA(a: A): Promise<B> {
    const b = this._aToB.get(a);
    if (b) {
      this._update(a);
      return Promise.resolve(b);
    }

    const existingPromise = this._aToBpromise.get(a);
    if (existingPromise) {
      return existingPromise;
    }
    const promise = this._getBfromA(a);
    this._aToBpromise.set(a, promise);
    promise.then(b => {
      this._aToBpromise.delete(a);
      this._rememberPair(a, b);
    }, () => {
      this._aToBpromise.delete(a);
    });
    return promise;
  }

  getAfromB(b: B): Promise<A> {
    const a = this._bToA.get(b);
    if (a) {
      this._update(a);
      return Promise.resolve(a);
    }

    const existingPromise = this._bToApromise.get(b);
    if (existingPromise) {
      return existingPromise;
    }
    const promise = this._getAfromB(b);
    this._bToApromise.set(b, promise);
    promise.then(a => {
      this._bToApromise.delete(b);
      this._rememberPair(a, b);
    }, () => {
      this._bToApromise.delete(b);
    });
    return promise;
  }
}
