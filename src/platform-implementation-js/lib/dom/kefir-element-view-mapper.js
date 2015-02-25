import Kefir from 'kefir';

// Returns a function suitable for mapping over a stream returned from
// makeElementChildStream or kefirMakeElementChildStream. If the given viewFn
// returns a falsey value, then this will return null. If you're using a viewFn
// that can do that, then you may want to call .filter(Boolean) on the
// resulting stream.
export default function kefirElementViewMapper(viewFn) {
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
