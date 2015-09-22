/* @flow */
//jshint ignore:start

var Bacon = require('baconjs');

type Emitter = {
  addEventListener: Function;
  removeEventListener: Function;
};

export default function fromEventTargetCapture(target: Emitter, eventName: string): Bacon.Observable<any> {
  return Bacon.fromBinder(sink => {
    target.addEventListener(eventName, sink, true);
    return () => {
      target.removeEventListener(eventName, sink, true);
    };
  });
}
