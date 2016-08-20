/* @flow */

import _ from 'lodash';
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
    () => new BigNumber(/msg-[^:]+:[^:\d]*(\d+)/.exec(el.getAttribute('data-msg-id'))[1]).toString(16)
  );

  const heading = ec.run(
    'heading',
    () => {
      const heading = el.querySelector('div[role=heading]');
      if (!heading) throw new Error('failed to find heading');
      return heading;
    }
  );

  // Super-collapsed/HIDDEN messages don't have a body.
  const body: ?HTMLElement = el.querySelector('div[role=heading] ~ div:not(:empty)');

  // The last message in a thread is always loaded and doesn't have the toggle
  // collapse button.
  const toggleCollapse: ?HTMLElement = el.querySelector('div[jsaction$=".message_toggle_collapse"]');

  const loaded = body != null &&
    (toggleCollapse == null || toggleCollapse.getAttribute('role') === 'heading');

  const viewState = loaded ? 'EXPANDED' : body != null ? 'COLLAPSED' : 'HIDDEN';

  const isDraft = loaded && heading && !heading.querySelector('span[email]');

  const sender = (isDraft || !heading || !body) ? null : ec.run(
    'sender',
    () => querySelectorOne(heading, '[email]:first-child')
  );

  const recipientElements = isDraft ? null : el.querySelectorAll(
    '[role=heading] [email]:not(:first-child), [role=heading] + div [email]'
  );

  const attachmentsArea: ?HTMLElement = (isDraft || !body || viewState !== 'EXPANDED') ? null : ec.run(
    'attachments area',
    () => {
      const lastSection = _.last((body.parentElement:any).querySelectorAll('section:last-child'));
      if (!lastSection) {
        throw new Error('element not found');
      }
      return lastSection;
    }
  );

  const elements = {
    heading,
    body,
    sender,
    toggleCollapse,
    attachmentsArea
  };
  const score = 1 - (ec.errorCount() / ec.runCount());
  return {
    elements,
    attributes: {
      loaded,
      viewState,
      messageId,
      recipientElements,
      isDraft
    },
    score,
    errors: ec.getErrorLogs()
  };
}

/*:: const x = parser(({}:any)); */
export type Parsed = typeof x;
