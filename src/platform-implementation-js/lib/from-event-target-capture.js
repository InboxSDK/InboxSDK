/* @flow */
//jshint ignore:start

import * as Bacon from 'baconjs';

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
