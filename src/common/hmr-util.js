/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Kefir = require('kefir');
var moduleUsedUpdatableKeys: WeakMap<typeof module, Set<string>> = new WeakMap();

export function acceptSelf(module: typeof module) {
  if ((module:any).hot) {
    (module:any).hot.accept();
  }
}

// On the first load, the given function is executed. On subsequent loads, the
// initial return value is returned instead.
export function makeShared<T>(module: typeof module, fn: ()=>T, key:string='default'): T {
  acceptSelf(module);
  var usedKeys = moduleUsedUpdatableKeys.get(module);
  if (!usedKeys) {
    usedKeys = new Set();
    moduleUsedUpdatableKeys.set(module, usedKeys);
  }
  if (usedKeys.has(key)) {
    throw new Error("makeUpdatable can only be used once per module with a given key");
  }
  usedKeys.add(key);
  var value;
  if ((module:any).hot) {
    if (
      (module:any).hot.data &&
      (module:any).hot.data._hmru_shared &&
      Object.prototype.hasOwnProperty.call((module:any).hot.data._hmru_shared, key)
    ) {
      value = (module:any).hot.data._hmru_shared[key];
    }
    (module:any).hot.dispose(data => {
      if (!data._hmru_shared)
        data._hmru_shared = {};
      data._hmru_shared[key] = value;
    });
  }
  if (value === undefined)
    value = fn();
  return value;
}

// On the first run, it returns the given object. On later runs, it updates the
// originally returned object to match the new one, and then returns it.
export function makeUpdatable<T: Object>(module: typeof module, object: T, key:string='default-updatable'): T {
  var sharedObject = makeShared(module, ()=>object, key);
  if (sharedObject !== object) {
    Object.defineProperties(
      sharedObject,
      _.chain(Object.getOwnPropertyNames(object))
        .map(name => [name, Object.getOwnPropertyDescriptor(object, name)])
        .map(([name, {value,enumerable}]) =>
          [name, {value,enumerable,writable:true,configurable:true}]
        )
        .zipObject()
        .value()
    );
  }
  return sharedObject;
}

// On the first run, creates a property that emits a given value. On subsequent
// loads, it returns the same property as last time, but
export function makeUpdatableStream<T>(module: typeof module, value: T, key:string='default-stream'): Kefir.Stream<T> {
  var sharedObject = makeShared(module, () => {
    var emitter;
    var stream = Kefir.stream(_emitter => {
      emitter = _emitter;
    });
    var property = stream.toProperty();
    property.onValue(_.noop);
    return {
      property,
      emit(x) {
        try {
          if (!emitter) throw new Error("Should not happen");
          emitter.emit(x);
        } catch(e) {
          setTimeout(() => {
            throw e;
          }, 0);
        }
      }
    };
  }, key);
  sharedObject.emit(value);
  return sharedObject.property;
}

export function makeUpdatableFn<T: Function>(module: typeof module, fn: T): T {
  var updatable = makeUpdatable(module, {fn}, 'updatable-fn-'+fn.name);
  if ((module:any).hot) {
    var paramsList = _.range(fn.length).map(x => 'a'+x).join(',');
    var wrappedFn: any = new Function(
      'updatable',
      `
      var wrapper = function ${fn.name}__hmr_wrapper(${paramsList}){
        if (this instanceof wrapper) {
          var obj = Object.create(updatable.fn.prototype);
          obj.constructor = wrapper;
          var retval = updatable.fn.apply(obj, arguments);
          if (typeof retval === 'object') {
            obj = retval;
          }
          return obj;
        }
        return updatable.fn.apply(this, arguments);
      };
      return wrapper;
      `
    )(updatable);

    var updatableProto = makeUpdatable(module, fn.prototype, 'updatable-fn-proto-'+fn.name);
    wrappedFn.prototype = updatable.fn.prototype = updatableProto;
    return wrappedFn;
  }
  return fn;
}
