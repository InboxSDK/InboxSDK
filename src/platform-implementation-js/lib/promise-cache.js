// Map which removes rejected promises from itself once they reject.
// Can be passed another map in its constructor where it copies the real values
// to when they resolve.

export default class PromiseCache extends Map {
  constructor(realValuesMap=new Map()) {
    super();
    for (let [key, value] of realValuesMap.entries()) {
      super.set(key, Promise.resolve(value));
    }
    this.realValuesMap = realValuesMap;
  }

  set(key, value) {
    super.set(key, value);
    if (this.realValuesMap) {
      try {
        value.then(realValue => {
          this.realValuesMap.set(key, realValue);
        }, err => {
          super.delete(key);
        });
      } catch(err) {
        super.delete(key);
        throw err;
      }
    }
  }

  delete(key) {
    super.delete(key);
    this.realValuesMap.delete(key);
  }

  clear() {
    super.clear();
    this.realValuesMap.clear();
  }
}
