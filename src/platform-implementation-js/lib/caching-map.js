import _ from 'lodash';

// Both keys and values must be JSONifiable!

export default class CachingMap extends Map {
  constructor(cacheKey, opts={}) {
    const storage = opts.storage || localStorage;
    const flushTime = typeof opts.flushTime === 'undefined' ? 3000 : opts.flushTime;

    let lsc = null;
    try {
      lsc = JSON.parse(storage.getItem(cacheKey));
    } catch(e) {
      console.error("CachingMap: failed to parse item", cacheKey);
    }

    this._flush = _.noop;

    if (lsc) {
      super(lsc);
    } else {
      super();
    }

    this._flush = _.throttle(() => {
      storage.setItem(cacheKey, JSON.stringify(Array.from(this.entries())));
    }, flushTime, {leading: false});
  }

  set(key, value) {
    super.set(key, value);
    this._flush();
  }

  delete(key) {
    super.delete(key);
    this._flush();
  }

  clear() {
    super.clear();
    this._flush();
  }
}
