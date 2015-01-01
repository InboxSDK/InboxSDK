// Built to be able to take a stream from makeElementChildStream(). This doesn't
// call makeElementChildStream() here -- you can call that yourself so you can
// filter/map/merge that stream however you want before passing it here. Make
// sure that this stream stops being listened to at some point to trigger the
// destruction of the views!
function makeElementViewStream(opts) {
  var elementStream = opts.elementStream;
  var viewFn = opts.viewFn;

  return elementStream.map(function(event) {
    var view = viewFn(event.el);
    if (view) {
      event.removalStream.onValue(function() {
        view.destroy();
      });
    }
    return view;
  }).filter(Boolean);
}

module.exports = makeElementViewStream;
