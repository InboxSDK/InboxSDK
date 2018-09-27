/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import kefirStopper from 'kefir-stopper';

class InboxBackdrop {
  _preAutoCloseStream: Bus<Object> = kefirBus();
  _stopper: Kefir.Observable<null>&{destroy():void} = kefirStopper();
  _el: HTMLElement;

  constructor(zIndex=500, target=document.body) {
    const el = this._el = document.createElement('div');
    el.className = 'inboxsdk__inbox_backdrop';
    el.style.zIndex = String(zIndex);

    Kefir.fromEvents(el, 'click')
      .filter(event => {
        let isCanceled = false;
        const appEvent = {
          type: 'outsideInteraction',
          cause: event,
          cancel: () => {
            isCanceled = true;
          }
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
        .merge(Kefir.later(200)) // transition might not finish if element is hidden
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

  getPreAutoCloseStream(): Kefir.Observable<Object> {
    return this._preAutoCloseStream;
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  destroy() {
    this._preAutoCloseStream.end();
    this._stopper.destroy();
  }
}

export default defn(module, InboxBackdrop);
