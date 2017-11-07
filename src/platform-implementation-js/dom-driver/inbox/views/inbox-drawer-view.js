/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';
import InboxBackdrop from './inbox-backdrop';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import type {DrawerViewOptions} from '../../../driver-interfaces/driver';
import type ComposeView from '../../../views/compose-view';
import findParent from '../../../../common/find-parent';

const TAKE_OVER_EVENT = 'inboxSDKdrawerViewTakingOver';
const zIndex = 500;

class InboxDrawerView {
  _chrome: boolean;
  _exitEl: HTMLElement;
  _containerEl: HTMLElement;
  _el: HTMLElement;
  _backdrop: ?InboxBackdrop = null;
  _slideAnimationDone: Kefir.Observable<null>;
  _closing = kefirStopper();
  _closed = kefirStopper();
  _composeChanges = kefirBus();

  constructor(options: DrawerViewOptions) {
    this._chrome = typeof options.chrome === 'boolean' ? options.chrome : true;

    let insertionTarget = ((document.body:any):HTMLElement);
    let composeRect = null;

    const {composeView, closeWithCompose} = options;
    if (composeView) {
      const ret = this._setupComposeInsertionTarget(composeView, closeWithCompose);
      insertionTarget = ret.insertionTarget;
      composeRect = ret.composeRect;
    }

    this._setupElement(options, insertionTarget);

    // Move or resize the ComposeView so that it's not clipped by the DrawerView.
    let composeNeedToMoveLeft = 0;
    if (composeView) {
      if (!composeRect) throw new Error('should not happen');
      composeNeedToMoveLeft = this._setupComposeAnimation(composeView, composeRect, true);
    }

    this._el.offsetHeight; // force layout so that adding a class does a transition.
    this._el.classList.add('inboxsdk__active');
    this._slideAnimationDone = Kefir.fromEvents(this._el, 'transitionend')
      .take(1)
      .takeUntilBy(this._closing)
      .map(() => null);

    if (composeView) {
      this._positionCompose(composeView, composeNeedToMoveLeft);
    }

    // Gmail calls preventDefault on escape keypresses. We want to close the
    // drawer for any escape keypresses which weren't preventDefaulted by the
    // current extension.
    fromEventTargetCapture(document, 'keydown')
      .filter(e => e.key ? e.key === 'Escape' : e.which === 27)
      .takeUntilBy(this._closing)
      .onValue(e => {
        const origPreventDefault = e.preventDefault;
        e.preventDefault = function() {
          this._defaultPreventedInContext = true;
          return origPreventDefault.call(this);
        };
      });
    Kefir.fromEvents(document, 'keydown')
      .filter(e => e.key ? e.key === 'Escape' : e.which === 27)
      .filter(e => !e._defaultPreventedInContext)
      .takeUntilBy(this._closing)
      .onValue(() => {
        this.close();
      });
  }

  _setupComposeInsertionTarget(composeView: ComposeView, closeWithCompose: ?boolean): {composeRect: ClientRect, insertionTarget: HTMLElement} {
    if (composeView.isMinimized()) {
      throw new Error("Can't attach DrawerView to minimized ComposeView");
    }
    if (composeView.isInlineReplyForm()) {
      throw new Error("Can't attach DrawerView to inline ComposeView");
    }
    if (composeView.isFullscreen()) {
      composeView.setFullscreen(false);
    }
    const closeEvents = [
      Kefir.fromEvents(composeView, 'restored'),
      Kefir.later(10).flatMap(() =>
        Kefir.fromEvents(composeView, 'fullscreenChanged')
      )
    ];
    if (closeWithCompose) {
      closeEvents.push(
        Kefir.fromEvents(composeView, 'destroy'),
        Kefir.fromEvents(composeView, 'minimized')
      );
    }
    Kefir.merge(closeEvents)
      .takeUntilBy(this._closing.merge(this._composeChanges))
      .onValue(() => this.close());


    const composeEl = composeView.getElement();

    // Read the compose size before any DOM modifications besides un-fullscreening it.
    const composeRect = composeEl.getBoundingClientRect();

    // We're going to modify a bunch of elements, and then clean up our
    // modifications to them once the DrawerView is closed. However, if a
    // second DrawerView is opened, that will trigger this DrawerView to
    // close, and we need to avoid cleaning up the elements that the 2nd
    // DrawerView modifies so we don't trample its changes.
    // This is accomplished by us emitting TAKE_OVER_EVENT on every element
    // we modify. Then we listen for TAKE_OVER_EVENT on these elements. If we
    // get a TAKE_OVER_EVENT from another DrawerView, we don't do our cleanup
    // on that element.

    // Figure out where we're going to stick our DrawerView in the DOM, and
    // set up the z-indexes of the ComposeView's offsetParent and the
    // insertionTarget point so everything will look right.
    const composeOffsetParent = composeEl.offsetParent;
    if (!(composeOffsetParent instanceof HTMLElement)) throw new Error('should not happen');
    const insertionTarget = findParent(
      composeOffsetParent,
      el => window.getComputedStyle(el).getPropertyValue('z-index') !== 'auto' &&
        el.getBoundingClientRect().left === 0
    ) || ((document.body:any):HTMLElement);

    composeEl.dispatchEvent(new CustomEvent(TAKE_OVER_EVENT, {
      bubbles: false, cancelable: false, detail: null
    }));
    composeOffsetParent.dispatchEvent(new CustomEvent(TAKE_OVER_EVENT, {
      bubbles: false, cancelable: false, detail: null
    }));
    insertionTarget.dispatchEvent(new CustomEvent(TAKE_OVER_EVENT, {
      bubbles: false, cancelable: false, detail: null
    }));

    // Needed to stop composeviews from coming apart visually in Gmail.
    insertionTarget.classList.add('inboxsdk__drawers_in_use');
    // Needed to make DrawerView show over search bar in Inbox.
    insertionTarget.style.zIndex = String(zIndex);

    if (!composeOffsetParent.hasAttribute('data-drawer-old-zindex')) {
      composeOffsetParent.setAttribute('data-drawer-old-zindex', composeOffsetParent.style.zIndex);
    }
    composeOffsetParent.style.zIndex = String(zIndex+2); // 1 more than compose

    this._closed
      .merge(this._composeChanges)
      .takeUntilBy(Kefir.fromEvents(insertionTarget, TAKE_OVER_EVENT))
      .onValue(() => {
        insertionTarget.style.zIndex = '';
      });
    this._closed
      .merge(this._composeChanges)
      .takeUntilBy(Kefir.fromEvents(composeOffsetParent, TAKE_OVER_EVENT))
      .onValue(() => {
        composeOffsetParent.style.zIndex = composeOffsetParent.getAttribute('data-drawer-old-zindex') || '';
        composeOffsetParent.removeAttribute('data-drawer-old-zindex');
      });

    return {composeRect, insertionTarget};
  }

  _setupElement(options: DrawerViewOptions, insertionTarget: HTMLElement) {
    this._backdrop = new InboxBackdrop(zIndex, insertionTarget);
    this._backdrop.getStopper().takeUntilBy(this._closing).onValue(() => {
      this.close();
    });

    this._containerEl = document.createElement('div');
    this._containerEl.className = 'inboxsdk__drawer_view_container';
    this._containerEl.style.zIndex = String(zIndex+1);

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
      closeButton.addEventListener('click', (e: MouseEvent) => {
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
  }

  _setupComposeAnimation(composeView: ComposeView, composeRect: ClientRect, forceLayout: boolean): number {
    const composeEl = composeView.getElement();
    const parentEl: HTMLElement = (composeEl.parentElement: any);
    const drawerRect = this._el.getBoundingClientRect();

    const margin = 24;
    const preexistingLeftAdjustment = parseInt(parentEl.style.left) || 0;
    const composeNeedToMoveLeft = composeRect.right - preexistingLeftAdjustment -
      (window.innerWidth - drawerRect.width - margin);
    if (composeNeedToMoveLeft > 0) {
      parentEl.style.position = 'relative';
      parentEl.style.transition = 'left 150ms cubic-bezier(.4,0,.2,1)';
      parentEl.style.left = '0';

      if (forceLayout) {
        parentEl.offsetHeight;
      }
      // We only want to force a full layout once, so we don't start the
      // animation here. We let the caller do that after they've forced layout
      // of the DrawerView _el too if they want.
    }
    return composeNeedToMoveLeft;
  }

  _positionCompose(composeView: ComposeView, composeNeedToMoveLeft: number) {
    if (composeNeedToMoveLeft > 0) {
      const composeEl = composeView.getElement();
      const parentEl: HTMLElement = (composeEl.parentElement: any);
      parentEl.style.left = `${-composeNeedToMoveLeft}px`;

      // When the drawer closes, animate the compose back to its original
      // location, and then unset our extra CSS.
      // If the drawer has a different compose associated with it, then just
      // immediately remove this compose view's extra CSS.
      this._closing
        .takeUntilBy(this._composeChanges)
        .takeUntilBy(Kefir.fromEvents(composeEl, TAKE_OVER_EVENT))
        .onValue(() => {
          parentEl.style.left = '0';
        })
        .flatMap(() =>
          Kefir.fromEvents(parentEl, 'transitionend')
            .merge(Kefir.later(200)) // transition might not finish if element is hidden
        )
        .merge(this._composeChanges)
        .take(1)
        .takeUntilBy(Kefir.fromEvents(composeEl, TAKE_OVER_EVENT))
        .onValue(() => {
          parentEl.style.position = '';
          parentEl.style.left = '';
          parentEl.style.transition = '';
        });
    }
  }

  associateComposeView(composeView: ComposeView, closeWithCompose: boolean) {
    this._composeChanges.emit(null);

    const {insertionTarget, composeRect} = this._setupComposeInsertionTarget(composeView, closeWithCompose);

    if (this._backdrop) insertionTarget.appendChild(this._backdrop.getElement());
    if (this._containerEl.parentElement !== insertionTarget) insertionTarget.appendChild(this._containerEl);


    const composeNeedToMoveLeft = this._setupComposeAnimation(composeView, composeRect, false);
    this._positionCompose(composeView, composeNeedToMoveLeft);
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
