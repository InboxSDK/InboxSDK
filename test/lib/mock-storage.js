import _ from 'lodash';

export default class MockStorage {
  constructor() {
    this._data = {};
  }

  get length() {
    const keys = Object.keys(this._data);
    return keys.length;
  }

  key(n) {
    const keys = Object.keys(this._data);
    if (n < keys.length) {
      return keys[n];
    } else {
      return null;
    }
  }

  getItem(key) {
    if (_.has(this._data, ""+key)) {
      return this._data[""+key];
    } else {
      return null;
    }
  }

  setItem(key, value) {
    this._data[""+key] = ""+value;
  }

  removeItem(key) {
    delete this._data[""+key];
  }

  clear() {
    this._data = {};
  }
}
