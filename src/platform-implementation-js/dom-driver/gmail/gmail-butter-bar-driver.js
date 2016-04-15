/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import RSVP from 'rsvp';

import streamWaitFor from '../../lib/stream-wait-for';
import makeRevocableFunction from '../../lib/make-revocable-function';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';

const elements = streamWaitFor(() => document.body.querySelector('div.b8[role="alert"]'))
  .map(noticeContainer => {
    const googleNotice = noticeContainer.querySelector('.vh:not(.inboxsdk__butterbar)');
    let sdkNotice = noticeContainer.querySelector('.vh.inboxsdk__butterbar');
    if (!sdkNotice) {
      sdkNotice = googleNotice.cloneNode(false);
      sdkNotice.classList.add('inboxsdk__butterbar');
      googleNotice.parentNode.insertBefore(sdkNotice, googleNotice.nextSibling);
    }
    return {noticeContainer, googleNotice, sdkNotice};
  })
  .toProperty();

const googleNoticeMutationChunks = elements
  .flatMapLatest(({googleNotice}) =>
    makeMutationObserverChunkedStream(googleNotice, {childList: true})
  );
const googleAddedNotice = googleNoticeMutationChunks
  .filter(mutations => mutations.some(m => m.addedNodes.length > 0));
const googleRemovedNotice = googleNoticeMutationChunks
  .filter(mutations => !mutations.some(m => m.addedNodes.length > 0));

const sdkRemovedNotice = elements
  .flatMapLatest(({sdkNotice}) =>
    makeMutationObserverChunkedStream(
      sdkNotice, {attributes:true, attributeFilter:['data-inboxsdk-id']}
    ).map(() => sdkNotice.getAttribute('data-inboxsdk-id'))
  )
  .filter(id => id == null);

const noticeAvailableStream = Kefir.merge([googleRemovedNotice, sdkRemovedNotice]);

function hideMessage(noticeContainer, googleNotice, sdkNotice) {
  googleNotice.style.display = '';
  noticeContainer.style.top = '-10000px';
  noticeContainer.style.position = 'relative';
  sdkNotice.style.display = 'none';
  sdkNotice.removeAttribute('data-inboxsdk-id');
}

export default class GmailButterBarDriver {
  constructor() {
    Kefir.combine([elements, googleAddedNotice])
      .onValue(({googleNotice, sdkNotice}) => {
        googleNotice.style.display = '';
        sdkNotice.style.display = 'none';
        sdkNotice.setAttribute('data-inboxsdk-id', 'gmail');
      });

    // Force stream to be in active state. sdkRemovedNotice is prone to missing
    // events if it only becomes active once a message has started.
    noticeAvailableStream.onValue(_.noop);
  }

  getNoticeAvailableStream() {
    return noticeAvailableStream;
  }

  getSharedMessageQueue() {
    const attr = document.head.getAttribute('data-inboxsdk-butterbar-queue');
    return attr ? JSON.parse(attr) : [];
  }

  setSharedMessageQueue(queue) {
    const attr = JSON.stringify(queue);
    document.head.setAttribute('data-inboxsdk-butterbar-queue', attr);
  }

  // Immediately displays the message, overriding anything else on the screen.
  // Priority and queuing logic is handled by butter-bar.js above this.
  showMessage(rawOptions) {
    const instanceId = Date.now()+'-'+Math.random();

    elements.take(1).onValue(({noticeContainer, googleNotice, sdkNotice}) => {
      noticeContainer.style.visibility = 'visible';
      noticeContainer.style.top = '';

      googleNotice.style.display = 'none';

      if (rawOptions.html) {
        sdkNotice.innerHTML = rawOptions.html;
      } else {
        sdkNotice.textContent = rawOptions.text;
      }
      sdkNotice.style.display = '';
      sdkNotice.setAttribute('data-inboxsdk-id', instanceId);
    });

    return {
      destroy() {
        elements.take(1).onValue(({noticeContainer, googleNotice, sdkNotice}) => {
          if (sdkNotice.getAttribute('data-inboxsdk-id') === instanceId) {
            hideMessage(noticeContainer, googleNotice, sdkNotice);
          }
        });
      }
    };
  }

  hideGmailMessage() {
    elements.take(1).onValue(({noticeContainer, googleNotice, sdkNotice}) => {
      if (sdkNotice.getAttribute('data-inboxsdk-id') === 'gmail') {
        hideMessage(noticeContainer, googleNotice, sdkNotice);
      }
    });
  }
}
