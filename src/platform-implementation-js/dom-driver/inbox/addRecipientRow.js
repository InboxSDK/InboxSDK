/* @flow */

import closest from 'closest-ng';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';

import type InboxComposeView from './views/inbox-compose-view';

type Options = {
  labelText?: ?string;
  el?: ?HTMLElement;
};

const createRowElement = ({labelText, el}: Options): HTMLElement => {
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
};

export default function addRecipientRow(
  inboxComposeView: InboxComposeView,
  recipientRowOptionStream: Kefir.Observable<?Options>
): () => void {
  let row: ?HTMLElement = null;

  const insertionPoint = inboxComposeView.getBCCRow();
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

    destroyStopper.merge(inboxComposeView.getStopper()).take(1).onValue(() => {
      if (row) {
        row.remove();
        row = null;
      }
    });

  return () => {
    destroyStopper.destroy();
  };
}
