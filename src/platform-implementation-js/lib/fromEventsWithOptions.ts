import * as Kefir from 'kefir';

import {
  Options,
  addEventListener,
  removeEventListener,
} from 'event-listener-with-options';

export default function fromEventsWithOptions(
  target: EventTarget,
  eventName: string,
  options: Options | boolean
): Kefir.Observable<any, never> {
  return Kefir.stream((emitter) => {
    addEventListener(target, eventName, emitter.emit, options);
    return () => {
      removeEventListener(target, eventName, emitter.emit, options);
    };
  });
}
