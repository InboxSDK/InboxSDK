/* @flow */
//jshint ignore:start

import Kefir from 'kefir';

// Built for flatMapping a stream from makeElementChildStream(). This doesn't
// call makeElementChildStream() here -- you can call that yourself so you can
// filter/map/merge that stream however you want before passing it here. Make
// sure that this stream (and therefore the source makeElementChildStream) stops
// being listened to at some point to trigger the destruction of the views!
type View = {destroy(): void};
import type {ElementWithLifetime} from './make-element-child-stream';

export default function makeElementViewStream<T: View>(viewFn: (el: HTMLElement) => ?T): (event: ElementWithLifetime) => Kefir.Observable<T> {
  return function(event) {
    const view = viewFn(event.el);
    if (view) {
      event.removalStream.take(1).onValue(() => {
        view.destroy();
      });
      return Kefir.constant(view);
    } else {
      return Kefir.never();
    }
  };
}
