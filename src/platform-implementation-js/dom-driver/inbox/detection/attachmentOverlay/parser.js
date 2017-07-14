/* @flow */

import t from 'transducers.js';
import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

import {defn} from 'ud';

function parser(el: HTMLElement) {
  const ec = new ErrorCollector('attachmentOverlay');

  ec.run('tabindex', () => {
    if (!el.hasAttribute('tabindex')) throw new Error('expected tabindex');
  });

  const downloadButton: ?HTMLElement = ec.run('downloadButton', () => {
    const candidate: ?HTMLElement = t.toArray(Array.prototype.slice.call(el.querySelectorAll('div[role=button][tabindex][data-tooltip]:not([aria-disabled=true]):not([aria-pressed]):not([aria-expanded])')), t.compose(
      t.filter(el =>
        el.childElementCount === 1 && el.firstElementChild.childElementCount === 0
      ),
      t.filter(el => {
        if (global.document) {
          const rect = el.getBoundingClientRect();
          if (rect.top > 100) return false;
          return true;
        } else {
          // Can't use screen position logic in unit tests so we're cheating a
          // little and depending on an exact class name.
          return el.parentElement.classList.contains('ndfHFb-c4YZDc-Wrql6b-C7uZwb-b0t70b');
        }
      }),
      t.filter(el => {
        const elIx = Array.prototype.indexOf.call(el.parentElement.children, el);
        const nextDivSibling = Array.prototype.filter.call(
          el.parentElement.children,
          (el, i) => i > elIx && el.nodeName === 'DIV'
        )[0];
        return nextDivSibling && nextDivSibling.getAttribute('aria-haspopup') === 'true';
      }),
      t.take(1)
    ))[0];
    if (!candidate) throw new Error('Failed to find element');
    if (candidate.getAttribute('aria-label') === 'Print') throw new Error('Found print button instead');
    return candidate;
  });

  const buttonContainer: ?HTMLElement = downloadButton ? (downloadButton:any).parentElement : null;

  const elements = {
    downloadButton,
    buttonContainer
  };
  const score = 1 - (ec.errorCount() / ec.runCount());
  return {
    elements,
    attributes: {
    },
    score,
    errors: ec.getErrorLogs()
  };
}

/*:: const x = parser(({}:any)); */
export type Parsed = typeof x;

export default defn(module, parser);
