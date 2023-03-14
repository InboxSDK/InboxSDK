interface SomeClass {
  new (...args: any[]): any;
}

export type MapperFn<T> = (t: T) => object;
export type Mapper<T extends SomeClass> = [T, MapperFn<InstanceType<T>>];

// Used to make the *View objects out of our *ViewDriver objects, and to make
// sure we return the same *View object back if we've already made one for
// given *ViewDriver.
export default class Membrane {
  private _mappers: Map<any, MapperFn<any>>;
  private _map: WeakMap<any, any> = new WeakMap();

  constructor(mappers: Array<Mapper<any>>) {
    this._mappers = new Map(mappers);
  }

  get(wet: any): any {
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
