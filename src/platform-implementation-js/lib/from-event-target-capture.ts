import * as Kefir from 'kefir';

interface Emitter {
  addEventListener: Function;
  removeEventListener: Function;
}

export default function fromEventTargetCapture(
  target: Emitter,
  eventName: string
): Kefir.Observable<any, never> {
  return Kefir.stream((emitter) => {
    function sink(event: any) {
      emitter.value(event);
    }
    target.addEventListener(eventName, sink, true);
    return () => {
      target.removeEventListener(eventName, sink, true);
    };
  });
}
