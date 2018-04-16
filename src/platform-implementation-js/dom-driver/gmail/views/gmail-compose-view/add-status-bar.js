/* @flow */

import once from 'lodash/once';
import Kefir from 'kefir';

import Logger from '../../../../lib/logger';
import SimpleElementView from '../../../../views/SimpleElementView';
import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';
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
  _gmailComposeView: GmailComposeView;
  _currentHeight: number;
  _orderHint: number;
  _prependContainer: ?HTMLElement = null;

  constructor(gmailComposeView: GmailComposeView, height: number, orderHint: number, addAboveNativeStatusBar: boolean) {
    const divNode = document.createElement('div');
    let el;

    if (gmailComposeView._driver.isUsingMaterialUI()) {
      const trNode = document.createElement('tr');
      el = trNode.appendChild(divNode);
    } else {
      el = divNode;
    }

    super(el);
    this._gmailComposeView = gmailComposeView;
    this._currentHeight = height;
    this._orderHint = orderHint;

    el.className = 'aDh inboxsdk__compose_statusbar';
    el.setAttribute('data-order-hint', String(orderHint));
    el.style.height = this._currentHeight + 'px';

    try {
      const statusArea = gmailComposeView.getStatusArea();
      gmailComposeView.getElement().classList.add('inboxsdk__compose_statusbarActive');

      if (addAboveNativeStatusBar) {
        const prependContainer = this._prependContainer = (
          statusArea.querySelector('.inboxsdk__compose_statusBarPrependContainer') ||
          document.createElement('div')
        );
        prependContainer.classList.add('inboxsdk__compose_statusBarPrependContainer');
        statusArea.insertAdjacentElement('afterbegin', prependContainer);

        insertElementInOrder(prependContainer, el);
      } else {
        insertElementInOrder(statusArea, el);
      }

      if (this._gmailComposeView.isInlineReplyForm()) {
        const currentPad = parseInt(this._gmailComposeView.getElement().style.paddingBottom, 10) || 0;
        this._gmailComposeView.getElement().style.paddingBottom = (currentPad + this._currentHeight) + 'px';
      }
    } catch (err) {
      Logger.error(err);
    }
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
}
