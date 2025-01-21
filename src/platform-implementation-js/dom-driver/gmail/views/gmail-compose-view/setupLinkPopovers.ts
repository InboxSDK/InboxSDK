import * as Kefir from 'kefir';
import toItemWithLifetimeStream from '../../../../lib/toItemWithLifetimeStream';
import type GmailComposeView from '../gmail-compose-view';
import type { TagTreeNode } from 'tag-tree';
import type { ItemWithLifetime } from '../../../../lib/dom/make-element-child-stream';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import SafeEventEmitter from '../../../../lib/safe-event-emitter';

class LinkPopOver extends SafeEventEmitter {
  private _linkEl: HTMLAnchorElement;
  private _popOverEl: HTMLElement;
  constructor(linkEl: HTMLAnchorElement, popOverEl: HTMLElement) {
    super();
    this._linkEl = linkEl;
    this._popOverEl = popOverEl;

    this.detectNewGmailUI(this._popOverEl);
  }

  detectNewGmailUI(popOverEl: HTMLElement) {
    /* 2025-1-21 version with new gmail style popover */
    if (
      popOverEl.classList.contains('VRezbc') &&
      popOverEl.classList.contains('phnWcc')
    ) {
      popOverEl.classList.add('inboxsdk__linkPopOver_newGmailUI');
    }
  }

  getLinkElement() {
    return this._linkEl;
  }

  getPopOverContainerElement() {
    return this._popOverEl;
  }

  getUrlInputElement() {
    // this is for the new gmail UI
    const inputs = this._popOverEl.querySelectorAll<HTMLInputElement>(
      'input.qdOxv-K0-wGMbrd',
    );

    // the url is the last or only input in the popover
    return inputs[inputs.length - 1];
  }

  getTextInputElement() {
    // this is for the new gmail UI
    const inputs = this._popOverEl.querySelectorAll<HTMLInputElement>(
      'input.qdOxv-K0-wGMbrd',
    );

    // if there are two inputs the text one is the first one
    if (inputs.length === 2) {
      return inputs[0];
    }
  }

  addSection() {
    let containerEl = this._popOverEl.querySelector<HTMLElement>(
      '.inboxsdk__linkPopOver_section_container',
    );
    if (!containerEl) {
      containerEl = document.createElement('div');
      containerEl.className = 'inboxsdk__linkPopOver_section_container';
      this._popOverEl.appendChild(containerEl);
    }
    return new LinkPopOverSection(this, containerEl);
  }
}

class LinkPopOverSection {
  private _el = document.createElement('div');
  constructor(linkPopOver: LinkPopOver, containerEl: HTMLElement) {
    this._el.className = 'inboxsdk__linkPopOver_section';
    containerEl.appendChild(this._el);
    linkPopOver.on('close', () => {
      this.remove();
    });
  }
  getElement() {
    return this._el;
  }
  remove() {
    this._el.remove();
  }
}

function getSelectedLink(
  gmailComposeView: GmailComposeView,
): HTMLAnchorElement | null {
  const focusNode = document.getSelection()?.focusNode;
  if (!focusNode) {
    return null;
  }
  if (focusNode instanceof Text) {
    if (
      focusNode.previousSibling instanceof HTMLAnchorElement &&
      document.getSelection()?.anchorOffset === 0
    ) {
      // For capturing link creation cases where the cursor ends up behind the link
      return focusNode.previousSibling;
    } else if (focusNode.nextSibling instanceof HTMLAnchorElement) {
      // google's popover appears when clicking just in front of a link as well
      return focusNode.nextSibling;
    }
  }
  return findLinkParent(focusNode, gmailComposeView.getBodyElement());
}

function findLinkParent(
  node: Node | null,
  composeBody: HTMLElement,
): HTMLAnchorElement | null {
  if (node instanceof HTMLAnchorElement) {
    return node;
  } else if (!node || node === composeBody) {
    return null;
  } else {
    return findLinkParent(node.parentElement, composeBody);
  }
}

export default function setupLinkPopOvers(
  gmailComposeView: GmailComposeView,
): Kefir.Observable<any, never> {
  return toItemWithLifetimeStream(
    gmailComposeView
      .getGmailDriver()
      .getTagTree()
      .getAllByTag('composeLinkPopOverContainer'),
  ).flatMap(
    ({ el, removalStream }: ItemWithLifetime<TagTreeNode<HTMLElement>>) => {
      const popOverEl = el.getValue();

      gmailComposeView
        .getGmailDriver()
        .getLogger()
        .eventSite('link_popOver', popOverEl);

      let existingLinkPopOver: LinkPopOver | null = null;

      removalStream.onValue(() => {
        if (existingLinkPopOver) {
          existingLinkPopOver.emit('close');
          existingLinkPopOver = null;
        }
      });

      return makeMutationObserverChunkedStream(popOverEl, {
        attributes: true,
        attributeFilter: ['style'],
      })
        .toProperty(() => null)
        .takeUntilBy(removalStream)
        .flatMap(() => {
          if (existingLinkPopOver) {
            existingLinkPopOver.emit('close');
            existingLinkPopOver = null;
          }

          if (popOverEl.style.visibility === 'visible') {
            const linkEl = getSelectedLink(gmailComposeView);
            if (linkEl && gmailComposeView.getElement().contains(linkEl)) {
              const linkPopOver = new LinkPopOver(linkEl, popOverEl);
              existingLinkPopOver = linkPopOver;
              return Kefir.constant({
                eventName: 'linkPopOver',
                data: linkPopOver,
              });
            }
          }

          return Kefir.never();
        });
    },
  );
}
