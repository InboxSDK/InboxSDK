/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

export default function parser(el: HTMLElement) {
  const ec = new ErrorCollector('threadRow');

  const inBundle = !el.hasAttribute('aria-multiselectable');

  ec.run('tabindex', () => {
    if (!el.hasAttribute('tabindex')) throw new Error('expected tabindex');
  });

  const subject = ec.run('subject', () => (
    querySelectorOne(
      el,
      'div[jsaction] > div:not(:first-child):not(:last-child) > div > div[class]:not([style]):not(:first-child) > div:not(:first-child):not(:last-child) > div:not([style]):not(:first-child):not(:last-child)'
    )
  ));

  const checkbox = ec.run('checkbox', () => (
    querySelectorOne(
      el,
      'div[jsaction] > div > div[jsaction] > div[role=checkbox]'
    )
  ));

  const recipients = ec.run(
    'recipients',
    () => el.querySelectorAll('div[jsaction] > div:not(:first-child):not(:last-child) > div > div > span[email]')
  );

  const isOnlyDraft = ec.run(
    'isOnlyDraft',
    () => !(recipients && recipients.length > 0)
  );

  const inboxThreadId: ?string = ec.run(
    'thread id',
    () =>
      /thread-[^:]+:[^:\d]*(\d+)/.exec(el.getAttribute('data-item-id') || '')[0]
  );

  const visibleMessageCount = ec.run(
    'visibleMessageCount',
    () => {
      const countEl = el.querySelector('div[jsaction] > div:not(:first-child):not(:last-child) > div > span > span');
      const match = countEl && /^\((\d+)\)$/.exec(countEl.textContent);
      if (!match) return 1;
      return parseInt(match[1]);
    }
  );

  const visibleDraftCount = ec.run(
    'visibleDraftCount',
    () => {
      if (isOnlyDraft && visibleMessageCount) return visibleMessageCount;

      const recipientEl = recipients && recipients[0];
      const draftCandidates = (
        recipientEl &&
        recipientEl.parentElement &&
        recipientEl.parentElement.querySelectorAll('span:not([email])')
      );
      if (!draftCandidates) return 0;

      return Array.from(draftCandidates).filter((candidate) => (
        !(candidate.textContent.includes(' .. ') || candidate.textContent.includes(', '))
      )).length;
    }
  );

  const contacts = ec.run(
    'contacts',
    () => {
      if (!recipients) return null;

      return Array.from(recipients).map((recipientEl) => {
        const emailAddress = recipientEl.getAttribute('email');
        if (!emailAddress) return null;

        return {name: null, emailAddress};
      }).filter(Boolean);
    }
  );

  const labelParent = ec.run(
    'labelParent',
    () => (
      querySelectorOne(
        el,
        'div[jsaction] > div:not(:first-child):not(:last-child) > div > div[class]:not([style]):not(:first-child) > div:not(:first-child):not(:last-child)'
      )
    )
  );

  const toolbar = ec.run(
    'toolbar',
    () => querySelectorOne(el, 'div[jsaction] div[jsaction] > ul[aria-label]')
  );

  const elements = {
    subject, checkbox, labelParent, toolbar
  };
  const score = 1 - (ec.errorCount() / ec.runCount());
  return {
    elements,
    attributes: {
      isOnlyDraft,
      inBundle,
      inboxThreadId,
      visibleMessageCount,
      visibleDraftCount,
      contacts
    },
    score,
    errors: ec.getErrorLogs()
  };
}

export type Parsed = $ReturnType<typeof parser>;
