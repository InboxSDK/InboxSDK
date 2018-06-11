/* @flow */

import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import once from 'lodash/once';

import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';
import Logger from '../../../../lib/logger';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import SimpleElementView from '../../../../views/SimpleElementView';

import type GmailComposeView from '../gmail-compose-view';
import type {Stopper} from 'kefir-stopper';

export default function addStatusBar(
  gmailComposeView: GmailComposeView,
  options: {height?: number, orderHint?: number, addAboveNativeStatusBar?: boolean}
) {
  const {height, orderHint, addAboveNativeStatusBar} = {
    height: 40,
    orderHint: 0,
    addAboveNativeStatusBar: false,
    ...options
  };

  const statusbar = new StatusBar(gmailComposeView, height, orderHint, addAboveNativeStatusBar);

  gmailComposeView.getStopper()
    .takeUntilBy(Kefir.fromEvents(statusbar, 'destroy'))
    .onValue(() => statusbar.destroy());

  return statusbar;
}

class StatusBar extends SimpleElementView {
  _addAboveNativeStatusBar: boolean;
  _currentHeight: number;
  _gmailComposeView: GmailComposeView;
  _orderHint: number;
  _prependContainer: ?HTMLElement = null;
  _stopper = kefirStopper();

  constructor(gmailComposeView: GmailComposeView, height: number, orderHint: number, addAboveNativeStatusBar: boolean) {
    let el = document.createElement('div');

    super(el);
    this._addAboveNativeStatusBar = addAboveNativeStatusBar;
    this._currentHeight = height;
    this._gmailComposeView = gmailComposeView;
    this._orderHint = orderHint;

    el.className = 'aDh inboxsdk__compose_statusbar';
    el.setAttribute('data-order-hint', String(orderHint));

    this.setHeight(this._currentHeight);

    const nativeStatusContainer = querySelector(gmailComposeView.getElement(), '.iN > tbody .aDj');
    makeMutationObserverChunkedStream(nativeStatusContainer, {
      attributeFilter: ['class'],
      attributes: true,
    })
      .toProperty(() => null)
      .takeUntilBy(this._stopper)
      .onValue(() => this.setStatusBar(nativeStatusContainer));
  }

  destroy() {
    if (this.destroyed) return;
    super.destroy();
    this._stopper.destroy();

    if (
      this._prependContainer &&
      this._prependContainer.children.length === 0
    ) {
      this._prependContainer.remove();
    }

    if (!this._gmailComposeView.getGmailDriver().isUsingMaterialUI() && this._gmailComposeView.isInlineReplyForm()) {
      const currentPad = parseInt(this._gmailComposeView.getElement().style.paddingBottom, 10) || 0;
      this._gmailComposeView.getElement().style.paddingBottom = (currentPad - this._currentHeight) + 'px';
    }
  }

  setHeight(newHeight: number) {
    this.el.style.height = newHeight + 'px';
    if (!this._gmailComposeView.getGmailDriver().isUsingMaterialUI() && this._gmailComposeView.isInlineReplyForm()) {
      const currentPad = parseInt(this._gmailComposeView.getElement().style.paddingBottom, 10) || 0;
      this._gmailComposeView.getElement().style.paddingBottom = (currentPad - this._currentHeight + (newHeight * 2)) + 'px';
    }
    this._currentHeight = newHeight;
  }

  setStatusBar(nativeStatusContainer: HTMLElement) {
    try {
      const statusArea = this._gmailComposeView.getStatusArea();
      this._gmailComposeView.getElement().classList.add('inboxsdk__compose_statusbarActive');

      if (this._addAboveNativeStatusBar) {
        const prependContainer = this._prependContainer = (
          statusArea.querySelector('.inboxsdk__compose_statusBarPrependContainer') ||
          document.createElement('div')
        );
        prependContainer.classList.add('inboxsdk__compose_statusBarPrependContainer');
        statusArea.insertAdjacentElement('afterbegin', prependContainer);

        insertElementInOrder(prependContainer, this.el);
      } else {
        if (this._gmailComposeView.getGmailDriver().isUsingMaterialUI() && this._gmailComposeView.isInlineReplyForm()) {
          //append to body
          const composeTable = querySelector(this._gmailComposeView.getElement(), '.iN > tbody');

          if (nativeStatusContainer.classList.contains('aDi')) {
            // the class .aDi can have both absolute or fixed positioning,
            // adjust bottom style for absolute
            if (nativeStatusContainer.style.position === 'absolute') {
              nativeStatusContainer.style.bottom = `${311 + this._currentHeight}px`;
            }

            // nativeStatusContainer height (60) + bottom padding (16) = 76
            nativeStatusContainer.style.height = `${76 + this._currentHeight}px`;
    
            const nativeStatusBar = querySelector(this._gmailComposeView.getElement(), '.iN > tbody .aDj.aDi .aDh');
            nativeStatusContainer.insertBefore(this.el, nativeStatusBar.nextSibling);
          } else {   
            insertElementInOrder(composeTable, this.el);
          }
        } else {
          insertElementInOrder(statusArea, this.el);
        }        
      }
    } catch (err) {
      Logger.error(err);
    }
  }
}
