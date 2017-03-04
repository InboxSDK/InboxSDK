/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

export default function parser(el: HTMLElement) {
  const collector = new ErrorCollector('searchBar');
  const rect = el.getBoundingClientRect();

  collector.run('position check', () => {
    if (rect.top > 100) {
      throw new Error('expected element to border top of screen');
    }
  });

  const searchInput = collector.run('searchInput', () => (
    querySelectorOne(el, 'div[role=search] input[role=combobox]')
  ));

  return {
    elements: {searchInput},
    score: 1 - (collector.errorCount() / collector.runCount()),
    errors: collector.getErrorLogs()
  };
}

/*:: const x = parser(({}:any)); */
export type Parsed = typeof x;
