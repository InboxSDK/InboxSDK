/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import type ItemWithLifetimePool from '../../../../lib/ItemWithLifetimePool';
import selectorStream from '../../../../lib/dom/selectorStream';
import topRowWatcher from '../topRow/watcher';

export default function watcher(root: Document=document, topRowElPool: ?ItemWithLifetimePool<*>=null): Kefir.Observable<ElementWithLifetime> {
  const topRowElStream: Kefir.Observable<ElementWithLifetime> = topRowElPool ? topRowElPool.items() : topRowWatcher(root);

  const selector = selectorStream([
    {$or: [
      [
        {$filter: el => !/#gmail:thread-/.test(el.getAttribute('data-item-id'))},
        {$watch: '[aria-expanded=true]'},
        '[role=list]',
        '*',
        ':not([id])',
        '*',
        '*',
        '[role=listitem]'
      ],
      [
        {$filter: el => /#gmail:thread-/.test(el.getAttribute('data-item-id'))}
      ]
    ]}
  ]);

  return topRowElStream
    .flatMap(({el,removalStream}) => selector(el).takeUntilBy(removalStream));
}
