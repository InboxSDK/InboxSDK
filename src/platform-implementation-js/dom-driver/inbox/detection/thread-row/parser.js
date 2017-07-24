/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

const RGB_REGEX = /^rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/;

export default function parser(el: HTMLElement) {
  const ec = new ErrorCollector('threadRow');

  const inBundle = !el.hasAttribute('aria-multiselectable');

  ec.run('tabindex', () => {
    if (!el.hasAttribute('tabindex')) throw new Error('expected tabindex');
  });

  const subject = ec.run('subject', () => (
    querySelectorOne(
      el,
      'div[jsaction][jslog] > div:not(:first-child):not(:last-child) > div > div[class]:not([style]):not(:first-child) > div:not(:first-child):not(:last-child) > div:not([style]):not(:first-child):not(:last-child):not([class*="inboxsdk"])'
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

  const draftLabels = ec.run(
    'draftLabels',
    () => {
      const recipientCandidates = el.querySelectorAll('div[jsaction] > div:not(:first-child):not(:last-child) > div > div > span');

      // We have to locate draft labels via text color because it's impossible
      // to locate them with reliable CSS selectors
      return Array.from(recipientCandidates).filter((candidate) => {
        const colorString = getComputedStyle(candidate).getPropertyValue('color');
        const colorMatch = RGB_REGEX.exec(colorString);
        if (!colorMatch) throw new Error("Failed to read color string");

        const r = +colorMatch[1], g = +colorMatch[2], b = +colorMatch[3];

        return r > 200 && g < 100 && b < 100; // Draft labels are red
      });
    }
  );

  const recipientParent = ec.run(
    'recipientParent',
    () => {
      if (recipients && recipients.length > 0) return recipients[0].parentElement;

      // There are no recipient elements with an email attr, which means this
      // thread only has drafts. In order to find the recipient parent we need
      // to work from a draft label upwards.
      if (!(draftLabels && draftLabels.length > 0)) throw new Error('Could not locate draft labels');
      return draftLabels[0].parentElement;
    }
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

      if (!draftLabels) throw new Error('Could not locate draft labels');
      return draftLabels.length;
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
        'div[jsaction][jslog] > div:not(:first-child):not(:last-child) > div > div[class]:not([style]):not(:first-child) > div:not(:first-child):not(:last-child)'
      )
    )
  );

  const elements = {
    subject, checkbox, labelParent, recipientParent
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
