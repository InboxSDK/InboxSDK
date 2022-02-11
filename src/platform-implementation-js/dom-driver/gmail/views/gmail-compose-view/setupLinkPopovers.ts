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
    let containerEl = this._popOverEl.querySelector<HTMLElement>('inboxsdk__section_container');
    if (!containerEl) {
      containerEl = document.createElement('div');
      containerEl.className = 'inboxsdk__linkPopOver_section_container';
      // this._popOverEl.appendChild(containerEl); TODO put in right spot
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
    }
  }
  return null;
}

export default function setupLinkPopovers(gmailComposeView: GmailComposeView): Kefir.Observable<any, never> {
  return toItemWithLifetimeStream(
    gmailComposeView.getGmailDriver().getTagTree().getAllByTag('composeLinkPopoverContainer')
  )
    .flatMap(({el, removalStream}: ItemWithLifetime<TagTreeNode<HTMLElement>>) => {
      const popOverEl = el.getValue();

      let existingLinkPopover: LinkPopOver | null = null;

      removalStream.onValue(() => {
        if (existingLinkPopover) {
          existingLinkPopover.emit('close');
          existingLinkPopover = null;
        }
      });

      return makeMutationObserverChunkedStream(popOverEl, {attributes: true, attributeFilter: ['style']})
        .toProperty(() => null)
        .takeUntilBy(removalStream)
        .flatMap(() => {
          if (existingLinkPopover) {
            existingLinkPopover.emit('close');
            existingLinkPopover = null;
          }

          if (popOverEl.style.visibility === 'visible') {
            const linkEl = getSelectedLink();
            if (linkEl && gmailComposeView.getElement().contains(linkEl)) {
              const linkPopOver = new LinkPopOver(linkEl, popOverEl);
              existingLinkPopover = linkPopOver;
              return Kefir.constant({
                eventName: 'linkPopOver',
                data: linkPopOver
              });
            }
          }

          return Kefir.never();
        });
    });


  // let newPopover = document.createElement('div');

  // // Mimic the gmail container styles
  // newPopover.style.cssText = `
  //   position: absolute;
  //   top: 35px;
  //   left: 0;
  //   height: 50px;
  //   width: 100%;
  //   background: #fff;
  //   border: 1px solid #a8a8a8;
  //   font: 13px arial,sans-serif;
  //   padding: 5px 8px;
  //   box-sizing: border-box;
  //   box-shadow: 0 1px 3px rgb(0 0 0 / 20%);
  // `;

  // newPopover.textContent = 'Test test streak stuff goes here';

  // insert to that div
  // gmailLinkPopover.appendChild(newPopover);
}
