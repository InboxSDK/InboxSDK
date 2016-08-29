/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import type ItemWithLifetimePool from '../../../../lib/ItemWithLifetimePool';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import selectorStream from '../../../../lib/dom/selectorStream';
import threadWatcher from '../thread/watcher';

export default function watcher(
  root: Document=document,
  openedThreadPool: ?ItemWithLifetimePool<ElementWithLifetime>=null
): Kefir.Observable<ElementWithLifetime> {
  const openedThreads = openedThreadPool ? openedThreadPool.items() : threadWatcher(root);

  const selector = selectorStream([
    '*',
    ':not([role=heading])',
    '[role=list]',
    '[role=listitem][data-msg-id]'
  ]);

  return openedThreads
    .flatMap(({el,removalStream}) => selector(el).takeUntilBy(removalStream));
}
