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
  _nativeStatusContainer: HTMLElement;
  _orderHint: number;
  _prependContainer: ?HTMLElement = null;
  _stopper = kefirStopper();

  constructor(gmailComposeView: GmailComposeView, height: number, orderHint: number, addAboveNativeStatusBar: boolean) {
    let el = document.createElement('div');
    el.style.fontFamily = 'Roboto,RobotoDraft,Helvetica,Arial,sans-serif';
    el.style.fontSize = '15.6px';

    super(el);
    this._addAboveNativeStatusBar = addAboveNativeStatusBar;
    this._currentHeight = 0;
    this._gmailComposeView = gmailComposeView;
    this._nativeStatusContainer = querySelector(gmailComposeView.getElement(), '.iN > tbody .aDj');
    this._orderHint = orderHint;

    el.className = 'aDh inboxsdk__compose_statusbar';
    el.setAttribute('data-order-hint', String(orderHint));

    this.setHeight(height);
    
    makeMutationObserverChunkedStream(this._nativeStatusContainer, {
      attributeFilter: ['class'],
      attributes: true,
    })
      .takeUntilBy(this._stopper)
      .onValue(() => this._setStatusBar());
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    super.destroy();
    this._stopper.destroy();

    if (
      this._prependContainer &&
      this._prependContainer.children.length === 0
    ) {
      this._prependContainer.remove();
    }

    this._undoStatusContainerHeightChange();
  }

  _undoStatusContainerHeightChange() {
    if (this._currentHeight == 0) return;
    if (!this._gmailComposeView.getGmailDriver().isUsingMaterialUI() && this._gmailComposeView.isInlineReplyForm()) {
      const currentPad = parseInt(this._gmailComposeView.getElement().style.paddingBottom, 10) || 0;
      this._gmailComposeView.getElement().style.paddingBottom = (currentPad - this._currentHeight) + 'px';
    } else if (this._gmailComposeView.getGmailDriver().isUsingMaterialUI() && this._gmailComposeView.isInlineReplyForm()) {
      if (this._nativeStatusContainer.classList.contains('aDi')) {
        const nativeStatusContainerHeight = parseInt(window.getComputedStyle(this._nativeStatusContainer).height, 10);
        const nativeStatusContainerPaddingBottom = 16;
        
        this._nativeStatusContainer.style.height = `${nativeStatusContainerHeight - this._currentHeight - nativeStatusContainerPaddingBottom}px`;
      }
    }
  }

  setHeight(newHeight: number) {
    this._undoStatusContainerHeightChange();

    this.el.style.height = newHeight + 'px';

    if (!this._gmailComposeView.getGmailDriver().isUsingMaterialUI() && this._gmailComposeView.isInlineReplyForm()) {
      const currentPad = parseInt(this._gmailComposeView.getElement().style.paddingBottom, 10) || 0;
      this._gmailComposeView.getElement().style.paddingBottom = ((currentPad - this._currentHeight) + newHeight) + 'px';
    }

    this._currentHeight = newHeight;
    this._setStatusBar();
  }

  _setStatusBar() {
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
          // 'aDi' is added to the to the nativeStatusContainer when it is position: fixed or position: absolute 
          if (this._nativeStatusContainer.classList.contains('aDi')) {
            const nativeStatusContainerPaddingBottom = 16;
            let nativeStatusContainerHeight;

            if (this._nativeStatusContainer.style.position === 'absolute') {
              const replyBody = querySelector(this._gmailComposeView.getElement(), '.iN > tbody .Ap');
              const replyBodyHeight = parseInt(window.getComputedStyle(replyBody).height, 10);

              nativeStatusContainerHeight = parseInt(window.getComputedStyle(this._nativeStatusContainer).height, 10);
              this._nativeStatusContainer.style.bottom = `${replyBodyHeight - 64 - nativeStatusContainerHeight}px`;
            }

            nativeStatusContainerHeight = parseInt(window.getComputedStyle(this._nativeStatusContainer).height, 10);
            this._nativeStatusContainer.style.height = `${nativeStatusContainerHeight + nativeStatusContainerPaddingBottom + this._currentHeight}px`;

            const nativeStatusBar = querySelector(this._gmailComposeView.getElement(), '.iN > tbody .aDj.aDi .aDh .IZ');
            insertElementInOrder(nativeStatusBar, this.el);
          } else {
            //append to body
            const composeTable = querySelector(this._gmailComposeView.getElement(), '.iN > tbody');
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
