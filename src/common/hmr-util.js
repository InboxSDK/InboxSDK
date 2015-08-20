/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Kefir = require('kefir');
var ud = require('ud');

// On the first run, creates a property that emits a given value. On subsequent
// loads, it returns the same property as last time, but
export function makeUpdatableStream<T>(module: typeof module, value: T, key:string='default-stream'): Kefir.Stream<T> {
  var sharedObject = ud.defonce(module, () => {
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
