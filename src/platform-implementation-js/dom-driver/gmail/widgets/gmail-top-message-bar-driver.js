/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import fakeWindowResize from '../../../lib/fake-window-resize';

export default class GmailTopMessageBarDriver {
  _element: ?HTMLElement;
  _eventStream: Bus<any>;
  _resizeObserver: ?ResizeObserver;

  constructor(optionStream: Kefir.Observable<?Object>) {
    this._eventStream = kefirBus();

    const ResizeObserver = global.ResizeObserver;
    if (ResizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        this.setTopMessageBarHeight();
      });
    }

    optionStream
      .takeUntilBy(this._eventStream.filter(() => false).beforeEnd(() => null))
      .onValue(option => {
        if (!option) {
          if (this._element) {
            (this._element: any).remove();
            this._element = null;
          }
        } else if (option) {
          var element = this._element;
          if (!element) {
            element = this._element = document.createElement('div');
            element.classList.add('inboxsdk__topMessageBar');

            ((document.body: any): HTMLElement).insertBefore(
              element,
              ((document.body: any): HTMLElement).firstChild
            );
            ((document.body: any): HTMLElement).classList.add(
              'inboxsdk__hasTopMessageBar'
            );

            fakeWindowResize();
          }

          if (option.el !== element.children[0]) {
            element.innerHTML = '';

            if (option.el) {
              element.appendChild(option.el);

              if (this._resizeObserver) {
                this._resizeObserver.observe(element);
              }

              this.setTopMessageBarHeight();
            }
          }
        }
      });
  }

  destroy() {
    if (this._element) {
      (this._element: any).remove();
      this._element = null;
    }
    this._eventStream.end();

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    if (document.querySelectorAll('.inboxsdk__topMessageBar').length === 0) {
      ((document.body: any): HTMLElement).classList.remove(
        'inboxsdk__hasTopMessageBar'
      );
    } else {
      this.setTopMessageBarHeight();
    }

    fakeWindowResize();
  }

  getEventStream(): Kefir.Observable<Object> {
    return this._eventStream;
  }

  remove() {
    this.destroy();
  }

  setTopMessageBarHeight() {
    const topMessageBars = [
      ...document.querySelectorAll('.inboxsdk__topMessageBar')
    ];
    const height = topMessageBars.reduce(
      (acc, currValue) => acc + currValue.offsetHeight,
      0
    );

    ((document.body: any): HTMLElement).style.setProperty(
      '--inboxsdk__topMessageBar-height',
      `${height}px`
    );
  }
}
