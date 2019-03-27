/* @flow */

import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import once from 'lodash/once';

import SafeEventEmitter from '../../lib/safe-event-emitter';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector from '../../lib/dom/querySelectorOrFail';

import type { VIEW_STATE } from '../../driver-interfaces/message-view-driver';

export type CustomMessageDescriptor = {
  collapsedEl: HTMLElement,
  headerEl: HTMLElement,
  bodyEl: HTMLElement,
  iconUrl: string,
  sortDate: Date
};

export default class CustomMessageView extends SafeEventEmitter {
  _el: HTMLElement;
  _iconEl: HTMLElement;
  _contentEl: HTMLElement;
  _contentHeaderEl: HTMLElement;
  _contentBodyEl: HTMLElement;
  _destroyed: boolean = false;
  _stopper = kefirStopper();
  _lastDescriptor: ?CustomMessageDescriptor;
  _viewState: VIEW_STATE = 'COLLAPSED';

  _hiddenCustomMessageNoticeProvider: ?(
    numberCustomMessagesHidden: number,
    numberNativeMessagesHidden: ?number
  ) => ?HTMLElement;
  _hiddenCustomMessageNoticeElement: ?HTMLElement;

  constructor(
    descriptorStream: Kefir.Observable<CustomMessageDescriptor>,
    hiddenCustomMessageNoticeProvider: ?(
      numberCustomMessagesHidden: number,
      numberNativeMessagesHidden: ?number
    ) => ?HTMLElement,
    onReady: () => any
  ) {
    super();

    this._setupElement();
    this._hiddenCustomMessageNoticeProvider = hiddenCustomMessageNoticeProvider;

    descriptorStream
      .takeUntilBy(this._stopper)
      .onValue(descriptor => {
        this._el.setAttribute(
          'data-inboxsdk-sortdate',
          String(descriptor.sortDate.getTime())
        );

        const previousDescriptor = this._lastDescriptor;
        this._lastDescriptor = descriptor;

        if (
          !previousDescriptor ||
          previousDescriptor.iconUrl !== descriptor.iconUrl
        ) {
          const img = document.createElement('img');
          img.src = descriptor.iconUrl;
          this._iconEl.innerHTML = '';
          this._iconEl.appendChild(img);
        }

        if (
          (!previousDescriptor ||
            previousDescriptor.collapsedEl !== descriptor.collapsedEl) &&
          this._viewState === 'COLLAPSED'
        ) {
          if (previousDescriptor) previousDescriptor.collapsedEl.remove();
          this._contentEl.appendChild(descriptor.collapsedEl);
        }

        if (
          !previousDescriptor ||
          previousDescriptor.headerEl !== descriptor.headerEl
        ) {
          if (previousDescriptor) previousDescriptor.headerEl.remove();
          this._contentHeaderEl.appendChild(descriptor.headerEl);
        }

        if (
          !previousDescriptor ||
          previousDescriptor.bodyEl !== descriptor.bodyEl
        ) {
          if (previousDescriptor) previousDescriptor.bodyEl.remove();
          this._contentBodyEl.appendChild(descriptor.bodyEl);
        }
      })
      .take(1)
      .onValue(() => onReady(this));
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._stopper.destroy();
    this.emit('destroy');
    this._el.remove();
  }

  getViewState(): VIEW_STATE {
    return this._viewState;
  }

  setViewState(newState: VIEW_STATE) {
    if (newState === this._viewState) {
      return;
    }

    // Remove the current view state
    const currentViewState = this._viewState;
    switch (currentViewState) {
      case 'HIDDEN':
        this._el.classList.remove('inboxsdk__custom_message_view_hidden');
        break;
      case 'COLLAPSED':
        this._el.classList.remove('inboxsdk__custom_message_view_collapsed');
        break;
      case 'EXPANDED':
        break;
      default:
        this._viewState = 'HIDDEN';
        throw new Error(`Unknown message view state "${currentViewState}"`);
    }

    switch (newState) {
      case 'HIDDEN':
        this._el.classList.add('inboxsdk__custom_message_view_hidden');
        this._setupHidden();
        break;
      case 'COLLAPSED':
        this._contentHeaderEl.remove();
        this._contentBodyEl.remove();

        if (this._lastDescriptor) {
          this._contentEl.appendChild(this._lastDescriptor.collapsedEl);
        }

        this._el.classList.add('inboxsdk__custom_message_view_collapsed');
        this.emit('collapsed');
        break;
      case 'EXPANDED':
        if (this._lastDescriptor) {
          this._lastDescriptor.collapsedEl.remove();
        }
        this._contentEl.appendChild(this._contentHeaderEl);
        this._contentEl.appendChild(this._contentBodyEl);
        this.emit('expanded');
        break;
      default:
        throw new Error(`Unknown message view state "${newState}"`);
    }
    this._viewState = newState;
  }

  getElement() {
    return this._el;
  }

  getSortDate() {
    if (this._lastDescriptor) return this._lastDescriptor.sortDate;
    else return null;
  }

  _setupElement() {
    this._el = document.createElement('div');
    this._el.classList.add('inboxsdk__custom_message_view');
    this._el.classList.add('inboxsdk__custom_message_view_collapsed');

    this._iconEl = document.createElement('div');
    this._iconEl.classList.add('inboxsdk__custom_message_view_icon');

    this._contentEl = document.createElement('div');
    this._contentEl.classList.add('inboxsdk__custom_message_view_content');

    this._contentHeaderEl = document.createElement('div');
    this._contentHeaderEl.classList.add('inboxsdk__custom_message_view_header');

    this._contentBodyEl = document.createElement('div');
    this._contentBodyEl.classList.add('inboxsdk__custom_message_view_body');

    this._el.appendChild(this._iconEl);
    this._el.appendChild(this._contentEl);

    this._el.addEventListener('click', (e: MouseEvent) => {
      if (this.getViewState() === 'COLLAPSED') {
        this.setViewState('EXPANDED');
        e.preventDefault();
        e.stopPropagation();
      }
    });

    this._contentHeaderEl.addEventListener('click', (e: MouseEvent) => {
      this.setViewState('COLLAPSED');
      e.preventDefault();
      e.stopPropagation();
    });
  }

  // Three cases:
  // 1. Am hidden next to gmail native hidden indicator
  // 2. Am hidden next to sdk hidden indicator
  // 3. Am hidden next to no indicator, one must be made
  _findContiguousHiddenIndicator(currentMessageIndex: number): ?HTMLElement {
    if (currentMessageIndex < 0) {
      return null;
    }

    if (!this._el.parentElement) {
      return null;
    }

    // Check below
    for (
      let i = currentMessageIndex;
      i <= this._el.parentElement.childElementCount;
      i++
    ) {
      const below = this._el.parentElement.children[i];

      if (!below) {
        break;
      }

      // Native indicator or SDK indicator
      if (below.classList.contains('adv') || false) {
        return below;
      }

      // Native message (collapsed or expanded)
      if (below.classList.contains('kv') || below.classList.contains('h7')) {
        break;
      }
    }

    for (let i = currentMessageIndex; 0 <= i; i--) {
      const above = this._el.parentElement.children[i];

      if (!above) {
        break;
      }

      // Native indicator, native hidden messages, or SDK indicator
      if (
        above.classList.contains('adv') /*|| above.classList.contains('kQ')*/ ||
        false
      ) {
        return above;
      }

      // Native message (collapsed or expanded)
      if (above.classList.contains('kv') || above.classList.contains('h7')) {
        break;
      }
    }
    return null;
  }

  _setupHidden() {
    if (!this._el.parentElement) {
      return;
    }
    const currentMessageIndex = Array.from(
      this._el.parentElement.children
    ).indexOf(this._el);

    const hiddenIndicatorElement = this._findContiguousHiddenIndicator(
      currentMessageIndex
    );

    if (!hiddenIndicatorElement) {
      // need to make an indicator
    } else if (false) {
      // add on to custom indicator
    } else {
      // add on to native indicator
      // listen for a class change on that message which occurs when it becomes visible
      makeMutationObserverChunkedStream(hiddenIndicatorElement, {
        attributes: true,
        attributeFilter: ['class']
      })
        .takeUntilBy(this._stopper)
        .filter(
          () =>
            hiddenIndicatorElement &&
            !hiddenIndicatorElement.classList.contains('kQ')
        ) //when kQ is gone, message is visible
        .onValue(() => {
          this.setViewState('COLLAPSED');
          if (this._hiddenCustomMessageNoticeElement)
            this._hiddenCustomMessageNoticeElement.remove();
          this._hiddenCustomMessageNoticeElement = null;
        });
    }

    if (hiddenIndicatorElement) {
      this._updateHiddenNotice(hiddenIndicatorElement, true);
    }

    //  this._stopper
    //   .take(1)
    //   .onValue(() => {
    //     this._hiddenCustomMessageViews.delete(customMessageView);
    //     if (hiddenNoticeMessageElement)
    //       this._updateHiddenNotice(
    //         hiddenNoticeMessageElement,
    //         nativeHiddenNoticePresent
    //       );
    //   });
  }

  _updateHiddenNotice(
    hiddenNoticeMessageElement: HTMLElement,
    nativeHiddenNoticePresent: boolean
  ) {
    const existingAppNoticeElement = this._hiddenCustomMessageNoticeElement;
    if (existingAppNoticeElement) {
      existingAppNoticeElement.remove();
      this._hiddenCustomMessageNoticeElement = null;
    }

    const noticeProvider = this._hiddenCustomMessageNoticeProvider;
    if (!noticeProvider) return;

    const appNoticeContainerElement = (this._hiddenCustomMessageNoticeElement = document.createElement(
      'span'
    ));
    appNoticeContainerElement.classList.add(
      'inboxsdk__custom_message_view_app_notice_content'
    );

    const numberCustomHiddenMessages = 1;

    let numberNativeHiddenMessages = null;
    if (nativeHiddenNoticePresent) {
      const nativeHiddenNoticeCountSpan = querySelector(
        hiddenNoticeMessageElement,
        '.adx span'
      );
      numberNativeHiddenMessages = Number(
        nativeHiddenNoticeCountSpan.innerHTML
      );
      if (isNaN(numberNativeHiddenMessages)) {
        throw new Error(
          "Couldn't find number of native hidden messages in dom structure"
        );
      }
    }

    const appNoticeElement = noticeProvider(
      numberCustomHiddenMessages,
      numberNativeHiddenMessages
    );
    if (!appNoticeElement) {
      return;
    }
    appNoticeContainerElement.appendChild(appNoticeElement);

    if (!nativeHiddenNoticePresent) {
      const fakeAppNoticeElement = document.createElement('span');
      fakeAppNoticeElement.classList.add('adx');

      const insertionPoint = querySelector(hiddenNoticeMessageElement, '.G3');
      insertionPoint.appendChild(fakeAppNoticeElement);
    }

    const hiddenNoticeElement = querySelector(
      hiddenNoticeMessageElement,
      '.adx'
    );
    hiddenNoticeElement.classList.add(
      'inboxsdk__custom_message_view_app_notice_container'
    );
    hiddenNoticeElement.appendChild(appNoticeContainerElement);
  }
}
