/* @flow */

import closest from 'closest-ng';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

import type InboxComposeView from './views/inbox-compose-view';

type Options = {
  labelText?: ?string;
  el?: ?HTMLElement;
};

const getInsertionPoint = (inboxComposeView) => {
  const bccInput = inboxComposeView.getBCCInput();
  if (!bccInput) throw new Error('Could not locate BCC input');

  const bccAncestor = closest(bccInput, 'div[class] > label + div[role=list]');
  const bccWrapper = (
    bccAncestor &&
    bccAncestor.parentElement
  );
  if (!bccWrapper) throw new Error('Could not locate BCC field wrapper');

  return bccWrapper;
};

const createRowElement = ({labelText, el}: Object): HTMLElement => {
  const row = document.createElement('div');
  const label = document.createElement('span');
  const content = document.createElement('div');

  row.classList.add('inboxsdk__recipient_row');
  label.classList.add('inboxsdk__recipient_label');
  content.classList.add('inboxsdk__recipient_content');

  if (labelText) {
    label.textContent = labelText;
    row.appendChild(label);
  }

  if (el) {
    content.appendChild(el);
    row.appendChild(content);
  }

  return row;
}

export default function addRecipientRow(
  inboxComposeView: InboxComposeView,
  recipientRowOptionStream: Kefir.Observable<?Object>
): () => void {
  let row: ?HTMLElement = null;

  const insertionPoint = getInsertionPoint(inboxComposeView);
  const destroyStopper = kefirStopper();

  recipientRowOptionStream
    .takeUntilBy(inboxComposeView.getStopper())
    .takeUntilBy(destroyStopper)
    .onValue((options) => {
      if (row) {
        row.remove();
        row = null;
      }

      if (options) {
        row = createRowElement(options);
        insertionPoint.insertAdjacentElement('afterend', row);
      }
    });

    destroyStopper.takeUntilBy(inboxComposeView.getStopper()).onValue(() => {
      if (row) {
        row.remove();
        row = null;
      }
    });

  return () => {
    destroyStopper.destroy();
  };
}
