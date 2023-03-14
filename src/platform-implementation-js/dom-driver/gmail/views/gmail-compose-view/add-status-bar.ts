import { defn } from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import cx from 'classnames';

import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';
import Logger from '../../../../lib/logger';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import SimpleElementView from '../../../../views/SimpleElementView';

import GmailComposeView from '../gmail-compose-view';

import { StatusBar as IStatusBar } from '../../../../driver-interfaces/compose-view-driver';

export default defn(module, addStatusBar);

function addStatusBar(
  gmailComposeView: GmailComposeView,
  options: {
    height?: number;
    orderHint?: number;
    addAboveNativeStatusBar?: boolean;
  }
): StatusBar {
  const { height, orderHint, addAboveNativeStatusBar } = {
    height: 40,
    orderHint: 0,
    addAboveNativeStatusBar: false,
    ...options,
  };

  const statusbar = new StatusBar(
    gmailComposeView,
    height,
    orderHint,
    addAboveNativeStatusBar
  );

  gmailComposeView
    .getStopper()
    .takeUntilBy(Kefir.fromEvents(statusbar, 'destroy'))
    .onValue(() => statusbar.destroy());

  return statusbar;
}

function createElement(orderHint: number, addAboveNativeStatusBar: boolean) {
  const el = document.createElement('div');
  el.className = cx('aDh', 'inboxsdk__compose_statusbar', {
    inboxsdk__addAboveNative: addAboveNativeStatusBar,
  });
  el.style.fontFamily = 'Roboto,RobotoDraft,Helvetica,Arial,sans-serif';
  el.style.fontSize = '15.6px';
  el.setAttribute('data-order-hint', String(orderHint));
  return el;
}

class StatusBar extends SimpleElementView implements IStatusBar {
  private _addAboveNativeStatusBar: boolean;
  private _gmailComposeView: GmailComposeView;
  private _nativeStatusContainer: HTMLElement;
  private _prependContainer: null | undefined | HTMLElement = null;
  private _stopper = kefirStopper();

  constructor(
    gmailComposeView: GmailComposeView,
    height: number,
    orderHint: number,
    addAboveNativeStatusBar: boolean
  ) {
    super(createElement(orderHint, addAboveNativeStatusBar));
    this._addAboveNativeStatusBar = addAboveNativeStatusBar;
    this._gmailComposeView = gmailComposeView;
    this._nativeStatusContainer = querySelector(
      gmailComposeView.getElement(),
      '.iN > tbody .aDj'
    );

    this._setStatusBar();
    this.setHeight(height);
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
    this._updateTotalHeight();
  }

  setHeight(newHeight: number) {
    this.el.style.height = newHeight + 'px';
    this._updateTotalHeight();
  }

  private _updateTotalHeight() {
    const totalAddedStatusBarHeight = Array.from(
      this._gmailComposeView
        .getElement()
        .querySelectorAll<HTMLElement>('.inboxsdk__compose_statusbar')
    )
      .map((el) => el.getBoundingClientRect().height)
      .reduce((a, b) => a + b, 0);

    this._gmailComposeView
      .getElement()
      .style.setProperty(
        '--inboxsdk-total-added-statusbar-height',
        totalAddedStatusBarHeight + 'px'
      );
  }

  private _setStatusBar() {
    try {
      const statusArea = this._gmailComposeView.getStatusArea();
      this._gmailComposeView
        .getElement()
        .classList.add('inboxsdk__compose_statusbarActive');

      if (this._addAboveNativeStatusBar) {
        const prependContainer = (this._prependContainer =
          (statusArea.querySelector(
            '.inboxsdk__compose_statusBarPrependContainer'
          ) as HTMLElement) || document.createElement('div'));
        prependContainer.classList.add(
          'inboxsdk__compose_statusBarPrependContainer'
        );
        statusArea.insertAdjacentElement('afterbegin', prependContainer);

        insertElementInOrder(prependContainer, this.el);
      } else {
        if (this._gmailComposeView.isInlineReplyForm()) {
          const nativeStatusBar = querySelector(
            this._gmailComposeView.getElement(),
            '.iN > tbody .aDj .aDh .IZ'
          );
          insertElementInOrder(nativeStatusBar, this.el);
        } else {
          insertElementInOrder(statusArea, this.el);
        }
      }
    } catch (err) {
      Logger.error(err);
    }
  }
}
