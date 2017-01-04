/* @flow */

import type Kefir from 'kefir';

// Returns a function suitable for mapping over a stream returned from
// makeElementChildStream or kefirMakeElementChildStream.
type View = {destroy(): void};
import type {ElementWithLifetime} from './make-element-child-stream';

export default function elementViewMapper<T: View>(viewFn: (el: HTMLElement) => T): (event: ElementWithLifetime) => T {
  return (event) => {
    const view = viewFn(event.el);
    event.removalStream.take(1).onValue(() => {
      view.destroy();
    });
    return view;
  };
}
