import _ from 'lodash';

// Both keys and values must be JSONifiable!

export default class CachingMap extends Map {
  constructor(cacheKey, opts={}) {
    const storage = opts.storage || localStorage;
    const flushTime = typeof opts.flushTime === 'undefined' ? 3000 : opts.flushTime;

    this._flush = _.noop;
    let initialized = false;

    try {
      const lsc = JSON.parse(storage.getItem(cacheKey));
      if (lsc) {
        super(lsc);
        initialized = true;
      }
    } catch(e) {
      console.error("CachingMap: failed to parse item", cacheKey, e);
    }

    if (!initialized) {
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
