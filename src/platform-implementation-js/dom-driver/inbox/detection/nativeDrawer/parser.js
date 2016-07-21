/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

export default function parser(el: HTMLElement) {
  const errors: any[] = [];
  if (el.childElementCount < 2) {
    errors.push('expected more children');
  }
  const rect = el.getBoundingClientRect();
  if (rect.top > 100) {
    errors.push('expected element to border top of screen');
  }
  if (window.innerWidth - rect.right > 100) {
    errors.push('expected element to border right side of screen');
  }
  if (window.innerHeight - rect.bottom > 100) {
    errors.push('expected element to border bottom side of screen');
  }

  return {
    elements: {},
    score: errors.length === 0 ? 1 : 0,
    errors
  };
}

/*:: const x = parser(({}:any)); */
export type Parsed = typeof x;
