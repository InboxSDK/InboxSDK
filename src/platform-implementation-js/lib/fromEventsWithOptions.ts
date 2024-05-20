import * as Kefir from 'kefir';

export default function fromEventsWithOptions(
  target: EventTarget,
  eventName: string,
  options: boolean,
): Kefir.Observable<any, never> {
  return Kefir.stream((emitter) => {
    target.addEventListener(eventName, emitter.emit, options);
    return () => {
      target.removeEventListener(eventName, emitter.emit, options);
    };
  });
}
