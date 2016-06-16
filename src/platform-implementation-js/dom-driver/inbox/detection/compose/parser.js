/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

export default function parser(el: HTMLElement) {
  const ec = new ErrorCollector('compose');

  const isInline = el.getAttribute('role') !== 'dialog';

  const sendBtn = ec.run(
    'send button',
    () => querySelectorOne(
      el,
      'div[jstcache] > div[role=button][jsaction$=".send"], '+
      'div[jstcache] > div[role=button][disabled]'
    )
  );
  const attachBtn = ec.run(
    'attach button',
    () => querySelectorOne(el, 'div[role=button][jsaction$=".attach"]')
  );
  const body = ec.run(
    'body',
    () => querySelectorOne(el, 'div[contenteditable][g_editable]')
  );
  const subject = isInline ? null : ec.run(
    'subject',
    () => {
      const subject = querySelectorOne(el, 'div[jstcache][jsan] > div > input[type=text][title][jsaction^="input:"]');
      if (!(subject instanceof HTMLInputElement)) throw new Error("Wrong type");
      return subject;
    }
  );
  const popOutBtn = isInline ? ec.run(
    'pop-out button',
    () => querySelectorOne(el, 'button[jsaction$=".quick_compose_popout_mole"]')
  ) : null;
  const closeBtn = isInline ? null : ec.run(
    'close button',
    () => querySelectorOne(
      el,
      'div[jstcache][jsan][jsaction] > button[jsaction$=".close_mole"]')
  );
  const minimizeBtn = isInline ? null : ec.run(
    'minimize button',
    () => querySelectorOne(
      el,
      'div[jstcache][jsan][jsaction] > button[jsaction$=".minimize_mole"]')
  );
  const bodyPlaceholder = isInline ? null : ec.run(
    'body placeholder',
    () => {
      const el = body && body.previousElementSibling;
      if (!(el instanceof HTMLElement) || el.nodeName !== 'LABEL')
        throw new Error(`compose body placeholder wrong type ${el && el.nodeName}`);
      return el;
    }
  );

  const elements = {
    sendBtn,
    attachBtn,
    body,
    subject,
    popOutBtn,
    closeBtn,
    minimizeBtn,
    bodyPlaceholder
  };
  const score = 1 - (ec.errorCount() / ec.runCount());
  return {
    elements,
    attributes: {
      isInline
    },
    score,
    errors: ec.getErrorLogs()
  };
}
