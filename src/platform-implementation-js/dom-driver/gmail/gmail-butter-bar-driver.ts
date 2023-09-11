import * as Kefir from 'kefir';

import streamWaitFor from '../../lib/stream-wait-for';
import querySelector from '../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';

const elements = streamWaitFor(() =>
  document.body.querySelector<HTMLElement>('div.b8[role="alert"]'),
)
  .map((noticeContainer: HTMLElement) => {
    const googleNotice = querySelector(
      noticeContainer,
      '.vh:not(.inboxsdk__butterbar)',
    );
    let sdkNotice = noticeContainer.querySelector<HTMLElement>(
      '.vh.inboxsdk__butterbar',
    );
    if (!sdkNotice) {
      sdkNotice = document.createElement('div');
      sdkNotice.classList.add('vh', 'inboxsdk__butterbar');
      sdkNotice.style.display = 'none';

      const textAndButtonsContainer = document.createElement('span');
      textAndButtonsContainer.classList.add('aT');

      const textContainer = document.createElement('span');
      textContainer.classList.add('inboxsdk__butterbar-text', 'bAq');

      const buttonsContainer = document.createElement('span');
      buttonsContainer.classList.add('inboxsdk__butterbar-buttons', 'bAo');
      buttonsContainer.innerHTML = '&nbsp;&nbsp;';

      const noticeCloseButton = document.createElement('div');
      noticeCloseButton.classList.add('inboxsdk__butterbar-close', 'bBe');
      noticeCloseButton.innerHTML = '<div class="bBf"></div>';
      noticeCloseButton.setAttribute('role', 'button');
      noticeCloseButton.tabIndex = 0;

      textAndButtonsContainer.appendChild(textContainer);
      textAndButtonsContainer.appendChild(buttonsContainer);

      sdkNotice.appendChild(textAndButtonsContainer);
      sdkNotice.appendChild(noticeCloseButton);

      const parentNode = googleNotice.parentNode;
      if (!parentNode) {
        throw new Error('parentNode not found');
      }
      parentNode.insertBefore(sdkNotice, googleNotice.nextSibling);
    }
    return { noticeContainer, googleNotice, sdkNotice };
  })
  .toProperty();

const googleNoticeMutationChunks = elements.flatMapLatest(({ googleNotice }) =>
  makeMutationObserverChunkedStream(googleNotice, { childList: true }),
);
const googleAddedNotice = googleNoticeMutationChunks.filter((mutations) =>
  mutations.some((m) => m.addedNodes.length > 0),
);
const googleRemovedNotice = googleNoticeMutationChunks.filter(
  (mutations) => !mutations.some((m) => m.addedNodes.length > 0),
);

const sdkRemovedNotice = elements
  .flatMapLatest(({ sdkNotice }) =>
    makeMutationObserverChunkedStream(sdkNotice, {
      attributes: true,
      attributeFilter: ['data-inboxsdk-id'],
    }).map(() => sdkNotice.getAttribute('data-inboxsdk-id')),
  )
  .filter((id) => id == null);

const noticeAvailableStream = Kefir.merge([
  googleRemovedNotice,
  sdkRemovedNotice as any,
]);

function hideMessage(
  noticeContainer: HTMLElement,
  googleNotice: HTMLElement,
  sdkNotice: HTMLElement,
) {
  googleNotice.style.display = '';
  noticeContainer.style.top = '-10000px';
  noticeContainer.style.position = 'relative';
  noticeContainer.classList.remove('bAp');
  sdkNotice.style.display = 'none';
  sdkNotice.removeAttribute('data-inboxsdk-id');
}

export default class GmailButterBarDriver {
  constructor() {
    Kefir.combine([elements, googleAddedNotice]).onValue(
      ([{ googleNotice, sdkNotice }]) => {
        googleNotice.style.display = '';
        sdkNotice.style.display = 'none';
        sdkNotice.setAttribute('data-inboxsdk-id', 'gmail');
      },
    );

    // Force stream to be in active state. sdkRemovedNotice is prone to missing
    // events if it only becomes active once a message has started.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    noticeAvailableStream.onValue(() => {});
  }

  getNoticeAvailableStream(): Kefir.Observable<any, unknown> {
    return noticeAvailableStream;
  }

  getSharedMessageQueue(): Array<any> {
    const attr = document.head.getAttribute('data-inboxsdk-butterbar-queue');
    return attr ? JSON.parse(attr) : [];
  }

  setSharedMessageQueue(queue: any) {
    const attr = JSON.stringify(queue);
    document.head.setAttribute('data-inboxsdk-butterbar-queue', attr);
  }

  // Immediately displays the message, overriding anything else on the screen.
  // Priority and queuing logic is handled by butter-bar.js above this.
  showMessage(rawOptions: any): { destroy(): void } {
    const instanceId = Date.now() + '-' + Math.random();

    const destroy = () => {
      elements
        .take(1)
        .onValue(({ noticeContainer, googleNotice, sdkNotice }) => {
          if (sdkNotice.getAttribute('data-inboxsdk-id') === instanceId) {
            if (rawOptions.className) {
              sdkNotice.classList.remove(rawOptions.className);
            }
            hideMessage(noticeContainer, googleNotice, sdkNotice);
          }
        });
    };

    elements.take(1).onValue(({ noticeContainer, googleNotice, sdkNotice }) => {
      noticeContainer.style.visibility = 'visible';
      noticeContainer.style.top = '';
      // The bAp css class is added to noticeContainer whenever a native butter is active in
      // Material Gmail. We replicate this native behavior by adding bAp to noticeContainer
      // when we show an SDK butter and removing it when the butter expires (see the
      // hideMessage function above).
      // The bAp class also causes butters to be styled and positioned as Snack Bars instead
      // (as opposed to butters).
      noticeContainer.classList.add('bAp');

      googleNotice.style.display = 'none';
      sdkNotice.className = googleNotice.className;
      sdkNotice.classList.add('inboxsdk__butterbar');

      const textContainer = querySelector(
        sdkNotice,
        '.inboxsdk__butterbar-text',
      );
      while (textContainer.firstChild) {
        textContainer.removeChild(textContainer.firstChild);
      }

      const buttonsContainer = querySelector(
        sdkNotice,
        '.inboxsdk__butterbar-buttons',
      );
      while (buttonsContainer.firstChild) {
        buttonsContainer.removeChild(buttonsContainer.firstChild);
      }

      if (rawOptions.html) {
        textContainer.innerHTML = rawOptions.html;
      } else if (rawOptions.el) {
        textContainer.appendChild(rawOptions.el);
      } else {
        textContainer.textContent = rawOptions.text;
      }

      if (rawOptions.buttons) {
        rawOptions.buttons.forEach((buttonDescriptor: any) => {
          const button = document.createElement('span');
          button.classList.add('ag', 'a8k');
          button.onclick = (e) => buttonDescriptor.onClick(e);
          button.setAttribute('role', 'button');
          button.tabIndex = 0;
          button.textContent = buttonDescriptor.title!;
          buttonsContainer.appendChild(button);
        });
      }

      const closeButton = querySelector(
        sdkNotice,
        '.inboxsdk__butterbar-close',
      );
      if (closeButton) {
        Kefir.fromEvents(closeButton, 'click').take(1).onValue(destroy);
      }

      if (rawOptions.className) {
        sdkNotice.classList.add(rawOptions.className);
      }

      sdkNotice.style.display = '';
      sdkNotice.setAttribute('data-inboxsdk-id', instanceId);
    });

    return { destroy };
  }

  hideGmailMessage() {
    elements.take(1).onValue(({ noticeContainer, googleNotice, sdkNotice }) => {
      if (sdkNotice.getAttribute('data-inboxsdk-id') === 'gmail') {
        hideMessage(noticeContainer, googleNotice, sdkNotice);
      }
    });
  }
}
