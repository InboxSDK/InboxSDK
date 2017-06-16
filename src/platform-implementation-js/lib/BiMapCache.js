/* @flow */

import throttle from 'lodash/throttle';
import sortBy from 'lodash/sortBy';

export type Options<A,B> = {
  key: string;
  getAfromB(b: B): Promise<A>;
  getBfromA(a: A): Promise<B>;
  storage?: Storage;
  saveThrottle?: number;
  maxLimit?: number;
  maxAge?: number;
};

export default class BiMapCache<A,B> {
  _key: string;
  _getAfromB: (b: B) => Promise<A>;
  _getBfromA: (a: A) => Promise<B>;
  _storage: ?Storage;
  _aToTimestamp: Map<A, number>;
  _aToB: Map<A, B>;
  _bToA: Map<B, A>;
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

    this._aToTimestamp = new Map(); // Map containing times the lookup was last done
    this._aToB = new Map();
    this._bToA = new Map();

    this._saveCache = throttle(() => {
      const storage = this._storage;
      if (!storage) return;
      // If there are other active BiMapCaches with the same key, then it's
      // important we load everything from storage first before overwriting it.
      this._loadCache();

      const minTimestamp = Date.now() - maxAge_;

      const item = {version: 2, ids: []};
      this._aToB.forEach((b, rfcId) => {
        const timestamp = this._aToTimestamp.get(rfcId);
        if (timestamp != null && timestamp > minTimestamp) {
          item.ids.push([rfcId, b, timestamp]);
        }
      });
      if (item.ids.length > maxLimit_) {
        item.ids = sortBy(item.ids, ([rfcId, b, timestamp]) => timestamp)
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
        const [rfcId, b, timestamp] = x;
        this._aToTimestamp.set(rfcId, timestamp);
        this._aToB.set(rfcId, b);
        this._bToA.set(b, rfcId);
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

    const promise = this._getBfromA(a);
    promise.then(b => {
      this._rememberPair(a, b);
    }, () => {});
    return promise;
  }

  getAfromB(b: B): Promise<A> {
    const a = this._bToA.get(b);
    if (a) {
      this._update(a);
      return Promise.resolve(a);
    }

    const promise = this._getAfromB(b);
    promise.then(a => {
      this._rememberPair(a, b);
    }, () => {});
    return promise;
  }
}
