/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import InboxBackdrop from './inbox-backdrop';
import type {DrawerViewOptions} from '../../../driver-interfaces/driver';

class InboxDrawerView {
  _chrome: boolean;
  _exitEl: HTMLElement;
  _el: HTMLElement;
  _backdrop: InboxBackdrop;
  _slideAnimationDone: Kefir.Stream;
  _closing: Kefir.Stream&{destroy():void} = kefirStopper();
  _closed: Kefir.Stream&{destroy():void} = kefirStopper();

  constructor(options: DrawerViewOptions) {
    this._chrome = typeof options.chrome === 'boolean' ? options.chrome : true;

    this._backdrop = new InboxBackdrop();
    this._backdrop.getStopper().takeUntilBy(this._closing).onValue(() => {
      this.close();
    });

    this._el = document.createElement('div');
    this._el.setAttribute('role', 'dialog');
    this._el.tabIndex = 0;
    this._el.className = 'inboxsdk__drawer_view';

    if (this._chrome) {
      const titleBar = document.createElement('div');
      titleBar.className = 'inboxsdk__drawer_title_bar';

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.title = 'Close';
      closeButton.className = 'inboxsdk__close_button';
      (closeButton:any).addEventListener('click', () => {
        this.close();
      });
      titleBar.appendChild(closeButton);

      const title = document.createElement('div');
      title.className = 'inboxsdk__drawer_title';
      title.setAttribute('role', 'heading');
      title.textContent = options.title;
      titleBar.appendChild(title);

      this._el.appendChild(titleBar);
    }

    this._el.appendChild(options.el);

    document.body.appendChild(this._el);

    this._closing.onValue(() => {
      this._backdrop.destroy();
      this._el.classList.remove('inboxsdk__active');
      Kefir.fromEvents(this._el, 'transitionend')
        .take(1)
        .onValue(() => {
          this._closed.destroy();
          this._el.remove();
        });
    });

    this._el.offsetHeight; // force layout so that adding this class does a transition.
    this._el.classList.add('inboxsdk__active');
    this._slideAnimationDone = Kefir.fromEvents(this._el, 'transitionend')
      .take(1)
      .takeUntilBy(this._closing)
      .map(() => null);
  }

  getSlideAnimationDone() {
    return this._slideAnimationDone;
  }

  getClosingStream() {
    return this._closing;
  }

  getClosedStream() {
    return this._closed;
  }

  close() {
    this._closing.destroy();
  }
}

export default defn(module, InboxDrawerView);
