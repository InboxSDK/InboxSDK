/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import InboxBackdrop from './inbox-backdrop';
import type {DrawerViewOptions} from '../../../driver-interfaces/driver';
import findParent from '../../../lib/dom/find-parent';

const TAKE_OVER_EVENT = 'inboxSDKdrawerViewTakingOver';

class InboxDrawerView {
  _chrome: boolean;
  _exitEl: HTMLElement;
  _containerEl: HTMLElement;
  _el: HTMLElement;
  _backdrop: ?InboxBackdrop = null;
  _slideAnimationDone: Kefir.Stream<any>;
  _closing: Kefir.Stream<any>&{destroy():void} = kefirStopper();
  _closed: Kefir.Stream<any>&{destroy():void} = kefirStopper();

  constructor(options: DrawerViewOptions) {
    this._chrome = typeof options.chrome === 'boolean' ? options.chrome : true;

    const zIndex = 500;
    let insertionTarget = document.body;

    let useBackdrop = true;

    const {composeView} = options;
    if (composeView) {
      if (composeView.isMinimized()) {
        throw new Error("Can't attach DrawerView to minimized ComposeView");
      }
      if (composeView.isInlineReplyForm()) {
        throw new Error("Can't attach DrawerView to inline ComposeView");
      }
      if (composeView.isFullscreen()) {
        composeView.setFullscreen(false);
      }
      Kefir.merge([
        Kefir.fromEvents(composeView, 'destroy'),
        Kefir.fromEvents(composeView, 'minimized'),
        Kefir.fromEvents(composeView, 'restored'),
        Kefir.later(10).flatMap(() =>
          Kefir.fromEvents(composeView, 'fullscreenChanged')
        )
      ])
        .takeUntilBy(this._closing)
        .onValue(() => this.close());

      if (document.querySelector('[jsaction="global.exit_full_screen"]')) {
        useBackdrop = false;
      }

      const composeEl = composeView.getElement();

      // We're going to modify a bunch of elements, and then clean up our
      // modifications to them once the DrawerView is closed. However, if a
      // second DrawerView is opened, that will trigger this DrawerView to
      // close, and we need to avoid cleaning up the elements that the 2nd
      // DrawerView modifies so we don't trample its changes.
      // This is accomplished by us emitting TAKE_OVER_EVENT on every element
      // we modify. Then we listen for TAKE_OVER_EVENT on these elements. If we
      // get a TAKE_OVER_EVENT from another DrawerView, we don't do our cleanup
      // on that element.
      composeEl.dispatchEvent(new CustomEvent(TAKE_OVER_EVENT, {
        bubbles: false, cancelable: false, detail: null
      }));

      // Figure out where we're going to stick our DrawerView in the DOM, and
      // set up the z-indexes of the ComposeView's offsetParent and the
      // insertionTarget point so everything will look right.
      const composeOffsetParent = composeEl.offsetParent;
      if (!(composeOffsetParent instanceof HTMLElement)) throw new Error('should not happen');
      composeOffsetParent.dispatchEvent(new CustomEvent(TAKE_OVER_EVENT, {
        bubbles: false, cancelable: false, detail: null
      }));
      insertionTarget = findParent(
        composeOffsetParent,
        el => window.getComputedStyle(el).getPropertyValue('z-index') !== 'auto' &&
          el.getBoundingClientRect().left === 0
      ) || document.body;
      insertionTarget.dispatchEvent(new CustomEvent(TAKE_OVER_EVENT, {
        bubbles: false, cancelable: false, detail: null
      }));

      // Needed to stop composeviews from coming apart visually in Gmail.
      insertionTarget.classList.add('inboxsdk__drawers_in_use');
      // Needed to make DrawerView show over search bar in Inbox.
      insertionTarget.style.zIndex = '500';

      if (!composeOffsetParent.hasAttribute('data-drawer-old-zindex')) {
        composeOffsetParent.setAttribute('data-drawer-old-zindex', composeOffsetParent.style.zIndex);
      }
      composeOffsetParent.style.zIndex = String(zIndex+1);

      this._closed
        .takeUntilBy(Kefir.fromEvents(insertionTarget, TAKE_OVER_EVENT))
        .onValue(() => {
          insertionTarget.style.zIndex = '';
        });
      this._closed
        .takeUntilBy(Kefir.fromEvents(composeOffsetParent, TAKE_OVER_EVENT))
        .onValue(() => {
          composeOffsetParent.style.zIndex = composeOffsetParent.getAttribute('data-drawer-old-zindex');
          composeOffsetParent.removeAttribute('data-drawer-old-zindex');
        });
    }

    if (useBackdrop) {
      this._backdrop = new InboxBackdrop(zIndex, insertionTarget);
      this._backdrop.getStopper().takeUntilBy(this._closing).onValue(() => {
        this.close();
      });
    }

    this._containerEl = document.createElement('div');
    this._containerEl.className = 'inboxsdk__drawer_view_container';
    this._containerEl.style.zIndex = String(zIndex+2);

    this._el = document.createElement('div');
    this._el.setAttribute('role', 'dialog');
    this._el.tabIndex = 0;
    this._el.className = 'inboxsdk__drawer_view';
    this._containerEl.appendChild(this._el);

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
      title.textContent = options.title || '';
      titleBar.appendChild(title);

      this._el.appendChild(titleBar);
    }

    this._el.appendChild(options.el);

    insertionTarget.appendChild(this._containerEl);

    this._closing.onValue(() => {
      if (this._backdrop) this._backdrop.destroy();
      this._el.classList.remove('inboxsdk__active');
      Kefir.fromEvents(this._el, 'transitionend')
        .merge(Kefir.later(200)) // transition might not finish if element is hidden
        .take(1)
        .onValue(() => {
          this._closed.destroy();
          this._containerEl.remove();
        });
    });

    // Move or resize the ComposeView so that it's not clipped by the DrawerView.
    let composeNeedToMoveLeft = 0;
    if (composeView) {
      const composeEl = composeView.getElement();
      const parentEl: HTMLElement = (composeEl.parentElement: any);
      const composeRect = composeEl.getBoundingClientRect();
      const drawerRect = this._el.getBoundingClientRect();

      const margin = 24;
      const preexistingLeftAdjustment = parseInt(parentEl.style.left) || 0;
      composeNeedToMoveLeft = composeRect.right - preexistingLeftAdjustment -
        (window.innerWidth - drawerRect.width - margin);
      if (composeNeedToMoveLeft > 0) {
        parentEl.style.position = 'relative';
        parentEl.style.transition = 'left 150ms cubic-bezier(.4,0,.2,1)';
        parentEl.style.left = '0';
        parentEl.offsetHeight; // force layout of compose
        // We only want to force a full layout once, so let's not dirty the DOM
        // again until after we've forced layout of the DrawerView _el too.
      }
    }

    this._el.offsetHeight; // force layout so that adding a class does a transition.
    this._el.classList.add('inboxsdk__active');
    this._slideAnimationDone = Kefir.fromEvents(this._el, 'transitionend')
      .take(1)
      .takeUntilBy(this._closing)
      .map(() => null);

    // Continue ComposeView positioning after forcing a layout above.
    if (composeView && composeNeedToMoveLeft > 0) {
      const composeEl = composeView.getElement();
      const parentEl: HTMLElement = (composeEl.parentElement: any);
      parentEl.style.left = `${-composeNeedToMoveLeft}px`;

      this._closing
        .takeUntilBy(Kefir.fromEvents(composeEl, TAKE_OVER_EVENT))
        .onValue(() => {
          parentEl.style.left = '0';
        });
      this._closed
        .takeUntilBy(Kefir.fromEvents(composeEl, TAKE_OVER_EVENT))
        .onValue(() => {
          parentEl.style.position = '';
          parentEl.style.left = '';
          parentEl.style.transition = '';
        });
    }
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
