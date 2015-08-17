/* @flow */
//jshint ignore:start

import _ from 'lodash';

var ignoreErrors = _.constant(true);

function getIfOwn(object: Object, prop: string): any {
  if (Object.prototype.hasOwnProperty.call(object, prop)) {
    return object[prop];
  }
  return null;
}

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
    oldFocus = getIfOwn(window.HTMLElement.prototype, 'focus'),
    oldBlur = getIfOwn(window.HTMLElement.prototype, 'blur');
  try {
    window.HTMLElement.prototype.focus = _.noop;
    window.HTMLElement.prototype.blur = _.noop;
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
    if (oldFocus) {
      window.HTMLElement.prototype.focus = oldFocus;
    } else {
      delete window.HTMLElement.prototype.focus;
    }
    if (oldBlur) {
      window.HTMLElement.prototype.blur = oldBlur;
    } else {
      delete window.HTMLElement.prototype.blur;
    }
    window.onerror = oldWindowOnerror;
    window.open = oldWindowOpen;
  }
  return url;
}
