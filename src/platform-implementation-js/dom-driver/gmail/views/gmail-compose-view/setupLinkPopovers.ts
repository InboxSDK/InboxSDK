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
  }

  getLinkElement() {
    return this._linkEl;
  }

  addSection() {
    let containerEl = this._popOverEl.querySelector<HTMLElement>('.inboxsdk__linkPopOver_section_container');
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

function getSelectedLink(): HTMLAnchorElement | null {
  const focusNode = document.getSelection()?.focusNode;

  if (!focusNode) {
    return null;
  }
  if (focusNode instanceof Text) {
    if (focusNode.parentElement instanceof HTMLAnchorElement) {
      return focusNode.parentElement;
    } else if (focusNode.nextSibling instanceof HTMLAnchorElement) {
      return focusNode.nextSibling;
    }
  }
  return null;
}

export default function setupLinkPopOvers(gmailComposeView: GmailComposeView): Kefir.Observable<any, never> {
  return toItemWithLifetimeStream(
    gmailComposeView.getGmailDriver().getTagTree().getAllByTag('composeLinkPopOverContainer')
  )
    .flatMap(({el, removalStream}: ItemWithLifetime<TagTreeNode<HTMLElement>>) => {
      const popOverEl = el.getValue();

      let existingLinkPopOver: LinkPopOver | null = null;

      removalStream.onValue(() => {
        if (existingLinkPopOver) {
          existingLinkPopOver.emit('close');
          existingLinkPopOver = null;
        }
      });

      return makeMutationObserverChunkedStream(popOverEl, {attributes: true, attributeFilter: ['style']})
        .toProperty(() => null)
        .takeUntilBy(removalStream)
        .flatMap(() => {
          if (existingLinkPopOver) {
            existingLinkPopOver.emit('close');
            existingLinkPopOver = null;
          }

          if (popOverEl.style.visibility === 'visible') {
            const linkEl = getSelectedLink();
            if (linkEl && gmailComposeView.getElement().contains(linkEl)) {
              const linkPopOver = new LinkPopOver(linkEl, popOverEl);
              existingLinkPopOver = linkPopOver;
              return Kefir.constant({
                eventName: 'linkPopOver',
                data: linkPopOver
              });
            }
          }

          return Kefir.never();
        });
    });
}
