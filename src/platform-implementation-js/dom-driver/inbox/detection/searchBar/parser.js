/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

export default function parser(el: HTMLElement) {
  const errors: any[] = [];
  const rect = el.getBoundingClientRect();
  if (rect.top > 100) {
    errors.push('expected element to border top of screen');
  }

  return {
    elements: {},
    score: errors.length === 0 ? 1 : 0,
    errors
  };
}

/*:: const x = parser(({}:any)); */
export type Parsed = typeof x;
