/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';
import BigNumber from 'bignumber.js';

export default function parser(el: HTMLElement) {
  const ec = new ErrorCollector('compose');

  ec.run('tabindex', () => {
    if (!el.hasAttribute('tabindex')) throw new Error('expected tabindex');
  });

  const messageId: ?string = ec.run(
    'message id',
    () => new BigNumber(/msg-[^:]+:(\d+)/.exec(el.getAttribute('data-msg-id'))[1]).toString(16)
  );

  const heading = ec.run(
    'heading',
    () => el.querySelector('div[role=heading]')
  );

  const body = ec.run(
    'body',
    () => el.querySelector('div[role=heading] ~ div:not(:empty)')
  );

  const toggleCollapse: ?HTMLElement = el.querySelector('div[jsaction$=".message_toggle_collapse"]');

  const loaded = body != null &&
    (toggleCollapse == null || toggleCollapse.getAttribute('role') === 'heading');

  const elements = {
    heading,
    body,
    toggleCollapse
  };
  const score = 1 - (ec.errorCount() / ec.runCount());
  return {
    elements,
    attributes: {
      loaded,
      messageId
    },
    score,
    errors: ec.getErrorLogs()
  };
}

/*:: const x = parser(({}:any)); */
export type Parsed = typeof x;
