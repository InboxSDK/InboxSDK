/* @flow */
//jshint ignore:start

import type Kefir from 'kefir';

// Returns a function suitable for mapping over a stream returned from
// makeElementChildStream or kefirMakeElementChildStream. If the given viewFn
// returns a falsey value, then this will return null. If you're using a viewFn
// that can do that, then you may want to call .filter(Boolean) on the
// resulting stream.
type View = {destroy: Function};
type TimedElement = {el: HTMLElement, removalStream: Kefir.Stream};

export default function elementViewMapper<T: View>(viewFn: (el: HTMLElement) => ?T): (event: TimedElement) => ?T {
  return (event) => {
    const view = viewFn(event.el);
    if (view) {
      event.removalStream.take(1).onValue(() => {
        view.destroy();
      });
      return view;
    } else {
      return null;
    }
  };
}
