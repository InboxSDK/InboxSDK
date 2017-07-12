/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';
import BigNumber from 'bignumber.js';

export default function parser(el: HTMLElement) {
  const ec = new ErrorCollector('attachmentCard');

  ec.run('tabindex', () => {
    if (!el.hasAttribute('tabindex')) throw new Error('expected tabindex');
  });

  // Very different cards like those for youtube links aren't detected by the
  // watcher/finder. Google drive cards aren't distinguishable from attachment
  // cards in the html, so we just expose them as FILE cards. The only issue
  // for applications is that cardView.addButton() is a no-op on drive cards.
  const type = 'FILE';

  const elements = {
  };
  const score = 1 - (ec.errorCount() / ec.runCount());
  return {
    elements,
    attributes: {
      type
    },
    score,
    errors: ec.getErrorLogs()
  };
}

/*:: const x = parser(({}:any)); */
export type Parsed = typeof x;
