/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import type ItemWithLifetimePool from '../../../../lib/ItemWithLifetimePool';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import selectorStream from '../../../../lib/dom/selectorStream';

export default function watcher(root: Document=document, threadRowElPool: ItemWithLifetimePool<*>): Kefir.Observable<ElementWithLifetime> {
  const threadRowElStream = threadRowElPool.items();

  const selector = selectorStream([
    {$watch: '[aria-expanded=true], .scroll-list-item-open'}
  ]);

  return threadRowElStream
    .flatMap(({el,removalStream}) => selector(el).takeUntilBy(removalStream));
}
