import * as Kefir from 'kefir';

// Built for flatMapping a stream from makeElementChildStream(). This doesn't
// call makeElementChildStream() here -- you can call that yourself so you can
// filter/map/merge that stream however you want before passing it here. Make
// sure that this stream (and therefore the source makeElementChildStream) stops
// being listened to at some point to trigger the destruction of the views!
interface View {
  destroy(): void;
}
import { ElementWithLifetime } from './make-element-child-stream';

export default function makeElementViewStream<T extends View>(
  viewFn: (el: HTMLElement) => T | null | undefined
): (event: ElementWithLifetime) => Kefir.Observable<T, never> {
  return (event) => {
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
