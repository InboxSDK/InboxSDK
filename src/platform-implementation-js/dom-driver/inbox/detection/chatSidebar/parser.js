/* @flow */

import _ from 'lodash';
import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

import {defn} from 'ud';

function parser(el: HTMLElement) {
  const ec = new ErrorCollector('chatSidebar');

  ec.run('position:fixed', () => {
    if (getComputedStyle((el:any).parentElement).position !== 'fixed') throw new Error('expected position:fixed in parent');
  });

  ec.run('id', () => {
    if (!el.id) throw new Error('expected id');
  });

  const elements = {
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
