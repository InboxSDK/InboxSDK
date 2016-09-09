/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

export default function parser(el: HTMLElement) {
  const ec = new ErrorCollector('appToolbarLocation');

  ec.run('children check', () => {
    if (el.childElementCount < 2) {
      throw new Error('expected more children');
    }
  });

  ec.run('position check', () => {
    const rect = el.getBoundingClientRect();
    if (rect.top > 100) {
      throw new Error('expected element to border top of screen');
    }
    if (window.innerWidth - rect.right > 100) {
      throw new Error('expected element to border right side of screen');
    }
    if (rect.width > 500) {
      throw new Error('expected element to span only the right of the screen');
    }
    if (rect.height > 150) {
      throw new Error('expected element to span only the right of the screen');
    }
  });

  const chatSidebarButton = ec.run('chatSidebarButton', () =>
    querySelectorOne(el, 'div[role=button][jsaction*="global.toggle_chat_roster"]')
  );

  const score = 1 - (ec.errorCount() / ec.runCount());
  return {
    elements: {
      chatSidebarButton
    },
    score,
    errors: ec.getErrorLogs()
  };
}

/*:: const x = parser(({}:any)); */
export type Parsed = typeof x;
