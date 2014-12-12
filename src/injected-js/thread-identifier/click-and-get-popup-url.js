var _ = require('lodash');

// Simulates a control+meta click on an element, intercepts the call to
// window.open, and returns the attempted popup's URL.
function clickAndGetPopupUrl(element) {
  var event = document.createEvent('MouseEvents');
  var options = {
    bubbles: true, cancelable: true, button: 0, pointerX: 0, pointerY: 0,
    ctrlKey: true, altKey: false, shiftKey: false, metaKey: true
  };
  event.initMouseEvent(
    'click', options.bubbles, options.cancelable, document.defaultView,
    options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
    options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, null
  );

  var url;
  var oldWindowOpen = window.open;
  try {
    window.open = function(_url, _title, _options) {
      url = _url;
      // Gmail checks the returned object for these two values specifically.
      var newWin = {
        closed: false, focus: _.noop
      };
      setTimeout(function() {
        newWin.closed = true;
      }, 5);
      return newWin;
    };
    element.dispatchEvent(event);
  } finally {
    window.open = oldWindowOpen;
  }
  return url;
}
module.exports = clickAndGetPopupUrl;
