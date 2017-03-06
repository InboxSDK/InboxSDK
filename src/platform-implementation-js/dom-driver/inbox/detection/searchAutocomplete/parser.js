/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

export default function parser(el: HTMLElement) {
  const collector = new ErrorCollector('searchAutocomplete');
  const rect = el.getBoundingClientRect();

  const recentSearches = collector.run('recentSearches', () => (
    querySelectorOne(el, 'ul:nth-last-of-type(2)')
  ));

  const results = collector.run('results', () => (
    querySelectorOne(el, 'ul:last-of-type')
  ));

  return {
    elements: {recentSearches, results},
    score: 1 - (collector.errorCount() / collector.runCount()),
    errors: collector.getErrorLogs()
  };
}

/*:: const x = parser(({}:any)); */
export type Parsed = typeof x;
