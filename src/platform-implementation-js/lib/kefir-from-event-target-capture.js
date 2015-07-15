/* @flow */
//jshint ignore:start

import Kefir from 'kefir';

type Emitter = {
  addEventListener(type: string, listener: (event: any) => void, useCapture?: boolean): void;
  removeEventListener(type: string, listener: (event: any) => void, useCapture?: boolean): void;
};

export default function fromEventTargetCapture(target: Emitter, eventName: string): Kefir.Stream {
  return Kefir.stream(emitter => {
    function sink (event) {
      emitter.emit(event);
    }
    target.addEventListener(eventName, sink, true);
    return () => {
      target.removeEventListener(eventName, sink, true);
    };
  });
}
