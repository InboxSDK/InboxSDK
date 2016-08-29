/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import type ItemWithLifetimePool from '../../../../lib/ItemWithLifetimePool';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import selectorStream from '../../../../lib/dom/selectorStream';
import threadRowWatcher from '../threadRow/watcher';

export default function watcher(root: Document=document, threadRowElPool: ?ItemWithLifetimePool<*>=null): Kefir.Observable<ElementWithLifetime> {
  const threadRowElStream = threadRowElPool ? threadRowElPool.items() : threadRowWatcher(root);

  const selector = selectorStream([
    {$watch: '[aria-expanded=true], .scroll-list-item-open'}
  ]);

  return threadRowElStream
    .flatMap(({el,removalStream}) => selector(el).takeUntilBy(removalStream));
}
