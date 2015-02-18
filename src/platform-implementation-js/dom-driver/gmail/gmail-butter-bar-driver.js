import _ from 'lodash';
import Bacon from 'baconjs';
import RSVP from 'rsvp';

import streamWaitFor from '../../lib/stream-wait-for';
import makeRevocableFunction from '../../lib/make-revocable-function';
import makeMutationObserverStream from '../../lib/dom/make-mutation-observer-stream';

const elements = streamWaitFor(() => document.body.querySelector('div.nn:nth-child(2) .b8'))
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

const googleNoticeMutations = elements
  .flatMapLatest(({googleNotice}) =>
    makeMutationObserverStream(googleNotice, {childList: true})
  );
const googleAddedNotice = googleNoticeMutations
  .filter(mutation => mutation.addedNodes.length > 0);
const googleRemovedNotice = googleNoticeMutations
  .filter(mutation => mutation.addedNodes.length === 0);

const sdkRemovedNotice = elements
  .flatMapLatest(({sdkNotice}) =>
    makeMutationObserverStream(sdkNotice, {attributes:true, attributeFilter:['data-inboxsdk-id']})
      .map(() => sdkNotice.getAttribute('data-inboxsdk-id'))
  )
  .filter(id => id == null);

const noticeAvailableStream = Bacon.mergeAll(googleRemovedNotice, sdkRemovedNotice);

Bacon.combineAsArray(elements, googleAddedNotice)
  .onValues(({googleNotice, sdkNotice}) => {
    googleNotice.style.display = '';
    sdkNotice.style.display = 'none';
    sdkNotice.removeAttribute('data-inboxsdk-id');
  });

export default class GmailButterBarDriver {
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

      sdkNotice.textContent = rawOptions.text;
      sdkNotice.style.display = '';
      sdkNotice.setAttribute('data-inboxsdk-id', instanceId);
    });

    return {
      destroy() {
        elements.take(1).onValue(({noticeContainer, googleNotice, sdkNotice}) => {
          if (sdkNotice.getAttribute('data-inboxsdk-id') === instanceId) {
            googleNotice.style.display = '';
            noticeContainer.style.top = '-10000px';
            sdkNotice.style.display = 'none';
            sdkNotice.removeAttribute('data-inboxsdk-id');
          }
        });
      }
    };
  }
}
