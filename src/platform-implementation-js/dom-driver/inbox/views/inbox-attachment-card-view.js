/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import findParent from '../../../../common/find-parent';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import type InboxDriver from '../inbox-driver';
import type InboxMessageView from './inbox-message-view';
import type InboxAttachmentOverlayView from './inbox-attachment-overlay-view';

import type {Parsed} from '../detection/attachmentCard/parser';

class InboxAttachmentCardView {
  _stopper = kefirStopper();
  _previewClicks = Kefir.pool();
  _element: HTMLElement;
  _driver: InboxDriver;
  _type: string;
  _p: ?Parsed; // This is only present for native cards
  _messageViewDriver: ?InboxMessageView;
  _addedButtonDescriptors: Object[] = [];
  _overlayView: ?InboxAttachmentOverlayView = null;

  constructor(options, driver: InboxDriver) {
    this._driver = driver;
    if (options.element) {
      this._element = options.element;
      this._p = options.parsed;
      this._type = options.parsed.attributes.type;

      Kefir.merge([
        Kefir.fromEvents(this._element, 'click'),
        Kefir.fromEvents(this._element, 'keydown')
      ])
        .takeUntilBy(this._stopper)
        .onValue(() => {
          this._driver.setLastInteractedAttachmentCardView(this);
        });
    } else {
      this._type = 'CUSTOM';
      this._createNewElement(options);
    }

    this._messageViewDriver = this._findMessageView();
    if (this._messageViewDriver) {
      this._messageViewDriver.addAttachmentCardViewDriver(this);
    }
  }

  destroy() {
    if (!this._p) {
      this._element.remove();
    }
    this._stopper.destroy();
  }

  _findMessageView(): ?InboxMessageView {
    const map = this._driver.getMessageViewElementsMap();
    const messageViewElement = findParent(this._element, el => map.has((el:any)));
    if (!messageViewElement) return null;
    return map.get(messageViewElement);
  }

  _createNewElement(options: Object) {
    if (options.previewUrl) {
      this._element = document.createElement('a');
      this._element.href = options.previewUrl;
    } else {
      this._element = document.createElement('div');
      this._element.tabIndex = 0;
    }
    this._element.title = options.title;

    const setupInnerHtml = options => {
      if (options.previewThumbnailUrl) {
        this._element.className = 'inboxsdk__attachment_card inboxsdk__attachment_card_with_preview';
        this._element.innerHTML = autoHtml `
          <img alt="" aria-hidden="true"
            style="width: 100%"
            src="${options.previewThumbnailUrl}"
            >
          <div class="inboxsdk__attachment_card_hover_overlay">
            <div class="inboxsdk__attachment_card_title">${options.title}</div>
            <div class="inboxsdk__attachment_card_buttons"></div>
          </div>
        `;
        if (options.failoverPreviewIconUrl) {
          Kefir.fromEvents(querySelector(this._element, 'img'), 'error')
            .take(1)
            .takeUntilBy(this._stopper)
            .onValue(() => {
              setupInnerHtml({
                ...options,
                previewThumbnailUrl: null,
                iconThumbnailUrl: options.failoverPreviewIconUrl
              });
            });
        }
      } else {
        this._element.className = 'inboxsdk__attachment_card';
        this._element.innerHTML = autoHtml `
          <div class="inboxsdk__attachment_card_nohover">
            <div class="inboxsdk__attachment_card_title">${options.title}</div>
            <div class="inboxsdk__attachment_card_description">
              <img alt="" aria-hidden="true" src="${options.fileIconImageUrl}">
              <span>${options.description || ''}</span>
            </div>
          </div>
          <div class="inboxsdk__attachment_card_hover_overlay">
            <div class="inboxsdk__attachment_card_title">${options.title}</div>
            <div class="inboxsdk__attachment_card_buttons"></div>
          </div>
        `;
      }

      options.buttons.forEach(button => {
        this.addButton(button);
      });
    };
    setupInnerHtml(options);
    this._previewClicks.plug(
      Kefir.merge([
        Kefir.fromEvents(this._element, 'click'),
        Kefir.fromEvents(this._element, 'keypress').filter(e => _.includes([32/*space*/, 13/*enter*/], e.which))
      ])
    );

    options.container.appendChild(this._element);
  }

  getElement() {
    return this._element;
  }

  getMessageViewDriver() {
    return this._messageViewDriver;
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  getPreviewClicks(): Kefir.Observable<Event> {
    return this._previewClicks.takeUntilBy(this._stopper);
  }

  getAttachmentType(): string {
    return this._type;
  }

  getAddedButtonDescriptors() {
    return this._addedButtonDescriptors;
  }

  addButton(button: Object): void {
    this._addedButtonDescriptors.push(button);
    if (!this._p) {
      // artificial SDK-added card. Native cards don't have their added buttons
      // processed here. They're added in InboxAttachmentOverlayView.
      const buttonContainer = querySelector(this._element, '.inboxsdk__attachment_card_buttons');
      const el = document.createElement('button');
      el.className = 'inboxsdk__attachment_card_button';
      if (button.downloadUrl) {
        el.setAttribute('data-inboxsdk-download-url', button.downloadUrl);
        (el:any).addEventListener('click', (event: MouseEvent) => {
          event.stopPropagation();
          event.preventDefault();
          let prevented = false;
          if (button.onClick) {
            button.onClick({
              preventDefault() {
                prevented = true;
              }
            });
          }
          if (prevented) return;
          const downloadLink = document.createElement('a');
          downloadLink.href = button.downloadUrl;
          downloadLink.addEventListener('click', function(e: MouseEvent) {
            e.stopPropagation();
          }, true);
          if (button.openInNewTab) {
            downloadLink.setAttribute('target', '_blank');
          }
          ((document.body:any):HTMLElement).appendChild(downloadLink);
          downloadLink.click();
          downloadLink.remove();
        });
        el.innerHTML = `
          <div style="background: no-repeat url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAYElEQVQ4y+2UMQ6AQAgEwfhQnnJP4adjc4UxB0ehhXqbULE7BRAUkLu1yQP6OXQveEab1DXTD0O9b53kIui+QReicnJ5lM2gArQA2LLcDCqAXYA2y1SgZ7BV/Lr+6TugB0K2GxxDXjEZAAAAAElFTkSuQmCC)"></div>
        `;
      } else {
        el.addEventListener('click', (event: MouseEvent) => {
          event.stopPropagation();
          event.preventDefault();
          if (button.onClick) {
            button.onClick({
              getDownloadURL() {
                throw new Error('not implemented for artificial sdk-added cardViews!');
              }
            });
          }
        });
        el.innerHTML = autoHtml `
          <img src="${button.iconUrl}">
        `;
        el.title = button.tooltip;
      }
      buttonContainer.appendChild(el);
    }
  }

  getTitle(): string {
    return this._element.title;
  }

  async getDownloadURL(): Promise<?string> {
    const overlayView = this._overlayView;
    if (!overlayView) throw new Error('This method only works during a button onClick callback in Inbox');
    return overlayView.getDownloadURL();
  }

  setOverlay(overlayView: ?InboxAttachmentOverlayView) {
    this._overlayView = overlayView;
  }
}

export default defn(module, InboxAttachmentCardView);
