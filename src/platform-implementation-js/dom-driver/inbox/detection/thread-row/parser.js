/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

export default function parser(el: HTMLElement) {
  const ec = new ErrorCollector('threadRow');

  const inBundle = !el.hasAttribute('aria-multiselectable');

  ec.run('tabindex', () => {
    if (!el.hasAttribute('tabindex')) throw new Error('expected tabindex');
  });

  const inboxThreadId: ?string = ec.run(
    'thread id',
    () =>
      /thread-[^:]+:[^:\d]*(\d+)/.exec(el.getAttribute('data-item-id') || '')[0]
  );

  const subject = ec.run('subject', () => (
    querySelectorOne(
      el,
      'div[jsaction] > div:not(:first-child):not(:last-child) > div > div[class]:not([style]):not(:first-child) > div:not(:first-child):not(:last-child) > div:not([style]):not(:first-child):not(:last-child)'
    )
  ));

  const elements = {
    subject
  };
  const score = 1 - (ec.errorCount() / ec.runCount());
  return {
    elements,
    attributes: {
      inBundle,
      inboxThreadId
    },
    score,
    errors: ec.getErrorLogs()
  };
}

export type Parsed = $ReturnType<typeof parser>;
