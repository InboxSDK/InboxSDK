import constant from 'lodash/constant';
import noop from 'lodash/noop';
import * as logger from '../../injected-logger';
const ignoreErrors = constant(true);

function getIfOwn(object: Record<string, any>, prop: string): any {
  if (Object.prototype.hasOwnProperty.call(object, prop)) {
    return object[prop];
  }

  return null;
} // Simulates a control+meta click on an element, intercepts the call to
// window.open, and returns the attempted popup's URL.

export default function clickAndGetPopupUrl(
  element: HTMLElement
): string | null | undefined {
  const event = document.createEvent('MouseEvents');
  const options = {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerX: 0,
    pointerY: 0,
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    metaKey: true,
  };
  event.initMouseEvent(
    'click',
    options.bubbles,
    options.cancelable,
    document.defaultView!,
    options.button,
    options.pointerX,
    options.pointerY,
    options.pointerX,
    options.pointerY,
    options.ctrlKey,
    options.altKey,
    options.shiftKey,
    options.metaKey,
    options.button,
    null
  );
  let url;
  const oldWindowOpen = window.open,
    oldWindowOnerror = window.onerror,
    oldFocus = getIfOwn(window.HTMLElement.prototype, 'focus'),
    oldBlur = getIfOwn(window.HTMLElement.prototype, 'blur');

  try {
    window.HTMLElement.prototype.focus = noop;
    window.HTMLElement.prototype.blur = noop;
    window.onerror = ignoreErrors;

    const newOpen = function (_url: string, _title: string, _options: any) {
      url = _url;
      // Gmail checks the returned object for these two values specifically.
      const newWin = {
        closed: false,
        focus: noop,
      };
      setTimeout(function () {
        newWin.closed = true;
      }, 5);
      return newWin;
    };

    window.open = newOpen as any;

    // If another extension created a setter on window.open, then setting it
    // could have failed. Log to see if this is a thing that ever happens, and
    // avoid letting windows be opened.
    if (window.open !== newOpen) {
      logger.error(new Error('Failed to override window.open'));
      return null;
    }

    element.dispatchEvent(event);
  } finally {
    if (oldFocus) {
      window.HTMLElement.prototype.focus = oldFocus;
    } else {
      delete (window.HTMLElement.prototype as any).focus;
    }

    if (oldBlur) {
      window.HTMLElement.prototype.blur = oldBlur;
    } else {
      delete (window.HTMLElement.prototype as any).blur;
    }

    window.onerror = oldWindowOnerror;
    window.open = oldWindowOpen;
  }

  return url;
}
