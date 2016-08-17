/* @flow */

import _ from 'lodash';
import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

import {defn} from 'ud';

function parser(el: HTMLElement) {
  const ec = new ErrorCollector('attachmentOverlay');

  ec.run('tabindex', () => {
    if (!el.hasAttribute('tabindex')) throw new Error('expected tabindex');
  });

  const downloadButton: ?HTMLElement = ec.run('downloadButton', () => {
    const candidates = _.chain(el.querySelectorAll('div[role=button][tabindex]:not([aria-disabled]):not([aria-pressed])'))
      .filter(el =>
        el.childElementCount === 1 && el.firstElementChild.childElementCount === 0
      )
      .filter((el, i) => {
        if (global.document) {
          const rect = el.getBoundingClientRect();
          if (rect.top > 100) return false;
          if (window.innerWidth - rect.right < 100) return false;
        } else {
          // Can't use screen position logic in unit tests. Just grab the first
          // element there.
          if (i > 0) return false;
        }
        return true;
      })
      .value();
    if (candidates.length !== 1) throw new Error(`wrong number: ${candidates.length}`);
    return candidates[0];
  });

  const buttonContainer: ?HTMLElement = buttonContainer ? (buttonContainer:any).parentElement : null;

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
