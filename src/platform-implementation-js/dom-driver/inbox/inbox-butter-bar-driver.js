/* @flow */

import Kefir from 'kefir';

import streamWaitFor from '../../lib/stream-wait-for';
import querySelector from '../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';

const elements = streamWaitFor(() => document.querySelector('body > div[id][jsaction] > div[id] > div[class][jsaction][aria-hidden]'))
  .map((googleNotice: HTMLElement) => {
    const noticeContainer = googleNotice.parentElement;
    if (!noticeContainer) throw new Error('Should not happen');
    let sdkNotice = noticeContainer.querySelector('.inboxsdk__butterbar');
    if (!sdkNotice) {
      sdkNotice = document.createElement('div');
      sdkNotice.className = googleNotice.className+' inboxsdk__butterbar';
      sdkNotice.style.display = 'none';
      noticeContainer.insertBefore(sdkNotice, googleNotice.nextSibling);
    }
    return {noticeContainer, googleNotice, sdkNotice};
  })
  .toProperty();

// We queue our notices separately from the native ones in Inbox.

const sdkNoticeIdChanges = elements
  .flatMapLatest(({sdkNotice}) =>
    makeMutationObserverChunkedStream(
      sdkNotice, {attributes:true, attributeFilter:['data-inboxsdk-id']}
    ).map(() => sdkNotice.getAttribute('data-inboxsdk-id'))
  );

const sdkRemovedNotice = sdkNoticeIdChanges
  .filter(id => id == null);

const noticeAvailableStream = sdkRemovedNotice;

function hideMessage(noticeContainer, googleNotice, sdkNotice) {
  Object.assign(sdkNotice.style, {
    opacity: '0',
    transform: '',
    transition: 'opacity 100ms'
  });
  sdkNotice.removeAttribute('data-inboxsdk-id');
  Kefir.fromEvents(sdkNotice, 'transitionend')
    .merge(Kefir.later(200)) // transition might not finish if element is hidden
    .takeUntilBy(sdkNoticeIdChanges.filter(id => id != null))
    .onValue(() => {
      Object.assign(sdkNotice.style, {
        display: 'none',
        opacity: '',
        transition: ''
      });
    });
}

export default class InboxButterBarDriver {
  constructor() {
    // Force stream to be in active state. sdkRemovedNotice is prone to missing
    // events if it only becomes active once a message has started.
    noticeAvailableStream.onValue(() => {});
  }

  getNoticeAvailableStream(): Kefir.Observable<any> {
    return noticeAvailableStream;
  }

  getSharedMessageQueue(): Array<Object> {
    const attr = (document.head:any).getAttribute('data-inboxsdk-butterbar-queue');
    return attr ? JSON.parse(attr) : [];
  }

  setSharedMessageQueue(queue: Object) {
    const attr = JSON.stringify(queue);
    (document.head:any).setAttribute('data-inboxsdk-butterbar-queue', attr);
  }

  // Immediately displays the message, overriding anything else on the screen.
  // Priority and queuing logic is handled by butter-bar.js above this.
  showMessage(rawOptions: Object): {destroy(): void} {
    const instanceId = Date.now()+'-'+Math.random();

    elements.take(1).onValue(({noticeContainer, googleNotice, sdkNotice}) => {
      sdkNotice.className = googleNotice.className;
      sdkNotice.classList.add('inboxsdk__butterbar');

      if (rawOptions.html) {
        sdkNotice.innerHTML = rawOptions.html;
      } else if (rawOptions.el) {
        sdkNotice.innerHTML = '';
        sdkNotice.appendChild(rawOptions.el);
      } else {
        sdkNotice.textContent = rawOptions.text;
      }

      if (rawOptions.className) {
        sdkNotice.classList.add(rawOptions.className);
      }

      // If the sdkNotice is already up, just flash it out and in instead of
      // animating it up into position.
      if (
        sdkNotice.style.display === 'block' &&
        getComputedStyle(sdkNotice).opacity === '1'
      ) {
        Object.assign(sdkNotice.style, {
          opacity: '0',
          transform: 'none',
          transition: 'none'
        });
        sdkNotice.offsetHeight; // force relayout
        Object.assign(sdkNotice.style, {
          opacity: '1',
          transition: ''
        });
      } else {
        Object.assign(sdkNotice.style, {
          opacity: '0',
          transform: '',
          transition: '',
          display: 'block'
        });
        sdkNotice.offsetHeight; // force relayout
        Object.assign(sdkNotice.style, {
          opacity: '1',
          transform: 'none'
        });
      }

      sdkNotice.setAttribute('data-inboxsdk-id', instanceId);
    });

    return {
      destroy() {
        elements.take(1).onValue(({noticeContainer, googleNotice, sdkNotice}) => {
          if (sdkNotice.getAttribute('data-inboxsdk-id') === instanceId) {
            if (rawOptions.className) sdkNotice.classList.remove(rawOptions.className);
            hideMessage(noticeContainer, googleNotice, sdkNotice);
          }
        });
      }
    };
  }

  hideGmailMessage() {
    // No-op in Inbox because we don't touch the native messages
  }
}
