/* @flow */

import Kefir from 'kefir';

import type {Options} from 'event-listener-with-options';
import {addEventListener, removeEventListener} from 'event-listener-with-options';

export default function fromEventsWithOptions(target: EventTarget, eventName: string, options: Options|boolean): Kefir.Stream {
  return Kefir.stream(emitter => {
    addEventListener(target, eventName, emitter.emit, options);
    return () => {
      removeEventListener(target, eventName, emitter.emit, options);
    };
  });
}
