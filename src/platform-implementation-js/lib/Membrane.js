/* @flow */

type MapperFn<T> = (t: T) => Object;
type Mapper<T> = [Class<T>, MapperFn<T>];

// Used to make the *View objects out of our *ViewDriver objects, and to make
// sure we return the same *View object back if we've already made one for
// given *ViewDriver.
export default class Membrane {
  _mappers: Map<Class<any>, MapperFn<any>>;
  _map: WeakMap<Object, Object> = new WeakMap();

  constructor(mappers: Array<Mapper<any>>) {
    this._mappers = new Map(mappers);
  }

  get(wet: Object): Object {
    let dry = this._map.get(wet);
    if (!dry) {
      const mapperFn = this._mappers.get(wet.constructor);
      if (!mapperFn) {
        throw new Error(`Unknown class ${wet.constructor.name}`);
      }
      dry = mapperFn(wet);
      this._map.set(wet, dry);
    }
    return dry;
  }
}
