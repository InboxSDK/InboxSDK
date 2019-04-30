/* @flow */

import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';
import Logger from '../../../../lib/logger';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import SimpleElementView from '../../../../views/SimpleElementView';

import type GmailComposeView from '../gmail-compose-view';
import type { Stopper } from 'kefir-stopper';

export default function addComposeNotice(
  gmailComposeView: GmailComposeView,
  options: {
    height?: number,
    orderHint?: number
  }
) {
  const { height, orderHint } = {
    orderHint: 0,
    ...options
  };

  const composeNotice = new ComposeNotice(gmailComposeView, height, orderHint);

  gmailComposeView
    .getStopper()
    .takeUntilBy(Kefir.fromEvents(composeNotice, 'destroy'))
    .onValue(() => composeNotice.destroy());

  return composeNotice;
}

class ComposeNotice extends SimpleElementView {
  _gmailComposeView: GmailComposeView;
  _stopper = kefirStopper();

  constructor(
    gmailComposeView: GmailComposeView,
    height: number,
    orderHint: number
  ) {
    let el = document.createElement('div');
    el.style.fontFamily = 'Roboto,RobotoDraft,Helvetica,Arial,sans-serif';
    el.style.fontSize = '14px';

    super(el);
    this._gmailComposeView = gmailComposeView;

    el.className = 'inboxsdk__compose_notice';
    el.setAttribute('data-order-hint', String(orderHint));

    if (height) {
      this.setHeight(height);
    }

    this._setComposeNotice();
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    super.destroy();
    this._stopper.destroy();
  }

  isForward() {}

  setHeight(height: number) {
    this.el.style.height = height + 'px';
  }

  _setComposeNotice() {
    try {
      const composeTable = querySelector(
        this._gmailComposeView.getElement(),
        '.iN'
      );

      const parentContainer = querySelector(
        this._gmailComposeView.getElement(),
        '.I5'
      );

      parentContainer.insertBefore(this.el, composeTable);
    } catch (err) {
      Logger.error(err);
    }
  }
}
