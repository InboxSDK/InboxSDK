/* @flow */

import LiveSet from 'live-set';
import type Kefir from 'kefir';
import type {ItemWithLifetime} from './dom/make-element-child-stream';

export default function toLiveSet<T>(itemWithLifetimeStream: Kefir.Observable<ItemWithLifetime<T>>): LiveSet<T> {
  return new LiveSet({
    read() {
      throw new Error('should not happen; liveset was inactive');
    },
    listen(setValues, controller) {
      setValues(new Set());

      const sub = itemWithLifetimeStream.observe({value({el, removalStream}) {
        controller.add(el);
        removalStream.take(1).onValue(() => {
          controller.remove(el);
        });
      }});

      return () => {
        sub.unsubscribe();
      };
    }
  });
}
