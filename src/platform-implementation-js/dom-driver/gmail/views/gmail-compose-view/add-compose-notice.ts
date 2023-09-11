import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';
import Logger from '../../../../lib/logger';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import SimpleElementView from '../../../../views/SimpleElementView';
import type GmailComposeView from '../gmail-compose-view';
export default function addComposeNotice(
  gmailComposeView: GmailComposeView,
  options: {
    orderHint?: number;
  },
) {
  const { orderHint } = {
    orderHint: 0,
    ...options,
  };
  const composeNotice = new ComposeNotice(gmailComposeView, orderHint);
  gmailComposeView
    .getStopper()
    .takeUntilBy(Kefir.fromEvents(composeNotice, 'destroy'))
    .onValue(() => composeNotice.destroy());
  return composeNotice;
}

class ComposeNotice extends SimpleElementView {
  _gmailComposeView: GmailComposeView;
  _orderHint: number;
  _stopper = kefirStopper();

  constructor(gmailComposeView: GmailComposeView, orderHint: number) {
    const el = document.createElement('div');
    el.style.fontFamily = 'Roboto,RobotoDraft,Helvetica,Arial,sans-serif';
    el.style.fontSize = '14px';
    super(el);
    this._gmailComposeView = gmailComposeView;
    this._orderHint = orderHint;
    el.className = 'inboxsdk__compose_notice';
    el.setAttribute('data-order-hint', String(orderHint));

    this._setComposeNotice();
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    super.destroy();

    this._stopper.destroy();
  }

  _setComposeNotice() {
    try {
      const composeTable = querySelector(
        this._gmailComposeView.getElement(),
        '.iN',
      );
      insertElementInOrder(composeTable, this.el, ['data-order-hint'], true);
    } catch (err) {
      Logger.error(err);
    }
  }
}
