var Bacon = require('baconjs');

// Built for flatMapping a stream from makeElementChildStream(). This doesn't
// call makeElementChildStream() here -- you can call that yourself so you can
// filter/map/merge that stream however you want before passing it here. Make
// sure that this stream (and therefore the source makeElementChildStream) stops
// being listened to at some point to trigger the destruction of the views!
function makeElementViewStream(viewFn) {
  return function(event) {
    var view = viewFn(event.el);
    if (view) {
      event.removalStream.onValue(function() {
        view.destroy();
      });
      return Bacon.once(view);
    } else {
      return Bacon.never();
    }
  };
}

module.exports = makeElementViewStream;
