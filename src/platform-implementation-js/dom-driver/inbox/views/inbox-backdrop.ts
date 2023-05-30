/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import kefirStopper from 'kefir-stopper';

class InboxBackdrop {
  _preAutoCloseStream: Bus<Record<string, any>, unknown> = kefirBus();
  _stopper: Kefir.Observable<null, unknown> & {
    destroy(): void;
  } = kefirStopper();
  _el: HTMLElement;

  constructor(
    zIndex: number = 500,
    target: HTMLElement = document.body as any
  ) {
    const el = (this._el = document.createElement('div'));
    el.className = 'inboxsdk__inbox_backdrop';
    el.style.zIndex = String(zIndex);
    Kefir.fromEvents<MouseEvent, unknown>(el, 'click')
      .filter((event) => {
        let isCanceled = false;
        const appEvent = {
          type: 'outsideInteraction',
          cause: event,
          cancel: () => {
            isCanceled = true;
          },
        };

        this._preAutoCloseStream.emit(appEvent);

        return !isCanceled;
      })
      .onValue((e: MouseEvent) => {
        this.destroy();
      });
    if (!target) throw new Error('no target');
    target.appendChild(el);

    this._stopper.onValue(() => {
      el.classList.remove('inboxsdk__active');
      Kefir.fromEvents(el, 'transitionend')
        .merge(Kefir.later(200, undefined)) // transition might not finish if element is hidden
        .take(1)
        .onValue(() => {
          el.remove();
        });
    });

    el.offsetHeight; // force layout so that adding this class does a transition.

    el.classList.add('inboxsdk__active');
  }

  getElement(): HTMLElement {
    return this._el;
  }

  getPreAutoCloseStream(): Kefir.Observable<Record<string, any>, unknown> {
    return this._preAutoCloseStream;
  }

  getStopper(): Kefir.Observable<null, unknown> {
    return this._stopper;
  }

  destroy() {
    this._preAutoCloseStream.end();

    this._stopper.destroy();
  }
}

export default InboxBackdrop;
