/* @flow */
//jshint ignore:start

import _ from 'lodash';

var ignoreErrors = _.constant(true);

// Simulates a control+meta click on an element, intercepts the call to
// window.open, and returns the attempted popup's URL.
export default function clickAndGetPopupUrl(element: HTMLElement): ?string {
  var event = document.createEvent('MouseEvents');
  var options = {
    bubbles: true, cancelable: true, button: 0, pointerX: 0, pointerY: 0,
    ctrlKey: true, altKey: false, shiftKey: false, metaKey: true
  };
  (event:any).initMouseEvent(
    'click', options.bubbles, options.cancelable, document.defaultView,
    options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
    options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, null
  );

  var url;
  var oldWindowOpen = window.open, oldWindowOnerror = window.onerror,
    oldFocus = window.Element.prototype.focus, oldBlur = window.Element.prototype.blur;
  try {
    window.Element.prototype.focus = _.noop;
    window.Element.prototype.blur = _.noop;
    window.onerror = ignoreErrors;
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
    window.Element.prototype.focus = oldFocus;
    window.Element.prototype.blur = oldBlur;
    window.onerror = oldWindowOnerror;
    window.open = oldWindowOpen;
  }
  return url;
}
