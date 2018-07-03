/* @flow */

import Kefir from 'kefir';

import streamWaitFor from '../../lib/stream-wait-for';
import querySelector from '../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';

const elements = streamWaitFor(() => ((document.body:any):HTMLElement).querySelector('div.b8[role="alert"]'))
  .map((noticeContainer: HTMLElement) => {
    const googleNotice = querySelector(noticeContainer, '.vh:not(.inboxsdk__butterbar)');
    let sdkNotice = noticeContainer.querySelector('.vh.inboxsdk__butterbar');
    if (!sdkNotice) {
      sdkNotice = (googleNotice.cloneNode(false): any);
      sdkNotice.classList.add('inboxsdk__butterbar');
      sdkNotice.style.display = 'none';
      const parentNode = googleNotice.parentNode;
      if(!parentNode) throw new Error('parentNode not found');
      parentNode.insertBefore(sdkNotice, googleNotice.nextSibling);
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
  noticeContainer.classList.remove('bAp');
  sdkNotice.style.display = 'none';
  sdkNotice.removeAttribute('data-inboxsdk-id');
}

export default class GmailButterBarDriver {
  constructor() {
    Kefir.combine([elements, googleAddedNotice])
      .onValue(({googleNotice, sdkNotice}) => {
        if(googleNotice) googleNotice.style.display = '';
        if(sdkNotice){
          sdkNotice.style.display = 'none';
          sdkNotice.setAttribute('data-inboxsdk-id', 'gmail');
        }
      });

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

    const destroy = () => {
        elements.take(1).onValue(({noticeContainer, googleNotice, sdkNotice}) => {
          if (sdkNotice.getAttribute('data-inboxsdk-id') === instanceId) {
            if (rawOptions.className) sdkNotice.classList.remove(rawOptions.className);
            hideMessage(noticeContainer, googleNotice, sdkNotice);
          }
        });
      };

    elements.take(1).onValue(({noticeContainer, googleNotice, sdkNotice}) => {
      noticeContainer.style.visibility = 'visible';
      noticeContainer.style.top = '';
      // The bAp css class is added to noticeContainer whenever a native butter is active in both
      // Gmailv1 and Material Gmail. We replicate this native behavior by adding bAp to
      // noticeContainer when we show an SDK butter and removing it when the butter expires (see the
      // hideMessage function above).
      // When in Material Gmail, the bAp class also causes butters to be styled and positioned as
      // Snack Bars instead (as opposed to butters). When in Gmailv1, is added and removed with the
      // same logic, but does not actually apply any styling.
      noticeContainer.classList.add('bAp');

      googleNotice.style.display = 'none';
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

      // Set up the close button shown in most Snack Bars in Material Gmail.
      // This button is hidden by css in Gmailv1.
      let noticeCloseButton = document.createElement('div');
      noticeCloseButton.classList.add('bBe');
      noticeCloseButton.setAttribute('role', 'button');
      noticeCloseButton.tabIndex = 0;
      noticeCloseButton.innerHTML = '<div class="bBf"></div>';

      sdkNotice.appendChild(noticeCloseButton);

      Kefir.fromEvents(noticeCloseButton, 'click')
        .take(1)
        .onValue(destroy);

      if (rawOptions.className) {
        sdkNotice.classList.add(rawOptions.className);
      }

      sdkNotice.style.display = '';
      sdkNotice.setAttribute('data-inboxsdk-id', instanceId);
    });

    return {destroy};
  }

  hideGmailMessage() {
    elements.take(1).onValue(({noticeContainer, googleNotice, sdkNotice}) => {
      if (sdkNotice.getAttribute('data-inboxsdk-id') === 'gmail') {
        hideMessage(noticeContainer, googleNotice, sdkNotice);
      }
    });
  }
}
