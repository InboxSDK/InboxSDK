/* @flow */

import Kefir from 'kefir';
import once from 'lodash/once';

import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';
import Logger from '../../../../lib/logger';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import SimpleElementView from '../../../../views/SimpleElementView';

import type GmailComposeView from '../gmail-compose-view';

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

  constructor(gmailComposeView: GmailComposeView, height: number, orderHint: number, addAboveNativeStatusBar: boolean) {
    let el = document.createElement('div');

    super(el);
    this._addAboveNativeStatusBar = addAboveNativeStatusBar;
    this._currentHeight = height;
    this._gmailComposeView = gmailComposeView;
    this._orderHint = orderHint;

    el.className = 'aDh inboxsdk__compose_statusbar';
    el.setAttribute('data-order-hint', String(orderHint));
    el.style.height = this._currentHeight + 'px';

    const gmailStatusContainer = querySelector(gmailComposeView.getElement(), '.iN > tbody .aDj');
    makeMutationObserverChunkedStream(gmailStatusContainer, {
      attributeFilter: ['class'],
      attributes: true,
    })
      .takeUntilBy(gmailComposeView.getStopper())
      .toProperty(() => null)
      .onValue(() => {
        this.setStatusBar();
      });
  }

  destroy() {
    if (this.destroyed) return;
    super.destroy();

    if (
      this._prependContainer &&
      this._prependContainer.children.length === 0
    ) {
      this._prependContainer.remove();
    }

    if (this._gmailComposeView.isInlineReplyForm()) {
      const currentPad = parseInt(this._gmailComposeView.getElement().style.paddingBottom, 10) || 0;
      this._gmailComposeView.getElement().style.paddingBottom = (currentPad - this._currentHeight) + 'px';
    }
  }

  setHeight(newHeight: number) {
    this.el.style.height = newHeight + 'px';
    if (this._gmailComposeView.isInlineReplyForm()) {
      const currentPad = parseInt(this._gmailComposeView.getElement().style.paddingBottom, 10) || 0;
      this._gmailComposeView.getElement().style.paddingBottom = ((currentPad - this._currentHeight) + newHeight) + 'px';
    }
    this._currentHeight = newHeight;
  }

  setStatusBar(stickyGmailStatusContainer) {
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

          let stickyGmailStatusContainer;
          try {
            stickyGmailStatusContainer = querySelector(this._gmailComposeView.getElement(), '.iN > tbody .aDj.aDi');
          } catch (err) {
            stickyGmailStatusContainer = false;
          }

          if (stickyGmailStatusContainer) {
            const gmailStatusBar = querySelector(this._gmailComposeView.getElement(), '.iN > tbody .aDj.aDi .aDh');
            stickyGmailStatusContainer.insertBefore(this.el, gmailStatusBar.nextSibling);
          } else {
            insertElementInOrder(composeTable, this.el);
          }
        } else {
          insertElementInOrder(statusArea, this.el);
        }
      }

      if (this._gmailComposeView.isInlineReplyForm()) {
        const currentPad = parseInt(this._gmailComposeView.getElement().style.paddingBottom, 10) || 0;
        this._gmailComposeView.getElement().style.paddingBottom = (currentPad + this._currentHeight) + 'px';
      }
    } catch (err) {
      Logger.error(err);
    }
  }
}
