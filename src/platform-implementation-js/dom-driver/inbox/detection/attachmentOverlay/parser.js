/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

import {defn} from 'ud';

function parser(el: HTMLElement) {
  const ec = new ErrorCollector('attachmentOverlay');

  const elements = {
  };
  // const score = 1 - (ec.errorCount() / ec.runCount());
  const score = 1;
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
