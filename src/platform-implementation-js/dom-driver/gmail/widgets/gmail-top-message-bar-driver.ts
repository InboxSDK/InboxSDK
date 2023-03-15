import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import fakeWindowResize from '../../../lib/fake-window-resize';

export default class GmailTopMessageBarDriver {
  _element: HTMLElement | null | undefined;
  _eventStream: Bus<any, unknown>;
  _resizeObserver: ResizeObserver | null | undefined;

  constructor(optionStream: Kefir.Observable<any, unknown>) {
    this._eventStream = kefirBus();

    const ResizeObserver = global.ResizeObserver;
    if (ResizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        this.setTopMessageBarHeight();
      });
    }

    optionStream
      .takeUntilBy(this._eventStream.filter(() => false).beforeEnd(() => null))
      .onValue((option) => {
        if (!option) {
          if (this._element) {
            this._element.remove();
            this._element = null;
          }
        } else if (option) {
          var element = this._element;
          if (!element) {
            element = this._element = document.createElement('div');
            element.classList.add('inboxsdk__topMessageBar');

            document.body.insertBefore(element, document.body.firstChild);
            document.body.classList.add('inboxsdk__hasTopMessageBar');

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
      this._element.remove();
      this._element = null;
    }
    this._eventStream.end();

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    if (document.querySelectorAll('.inboxsdk__topMessageBar').length === 0) {
      document.body.classList.remove('inboxsdk__hasTopMessageBar');
    } else {
      this.setTopMessageBarHeight();
    }

    fakeWindowResize();
  }

  getEventStream(): Kefir.Observable<any, unknown> {
    return this._eventStream;
  }

  remove() {
    this.destroy();
  }

  setTopMessageBarHeight() {
    const topMessageBars = [
      ...document.querySelectorAll<HTMLElement>('.inboxsdk__topMessageBar'),
    ];
    const height = topMessageBars.reduce(
      (acc, currValue) => acc + currValue.offsetHeight,
      0
    );

    document.body.style.setProperty(
      '--inboxsdk__topMessageBar-height',
      `${height}px`
    );
  }
}
