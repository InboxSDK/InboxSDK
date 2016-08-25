/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import Logger from '../../../../lib/logger';
import streamWaitFor from '../../../../lib/stream-wait-for';
import delayAsap from '../../../../lib/delay-asap';
import censorHTMLtree from '../../../../../common/censor-html-tree';
import makeElementChildStream from '../../../../lib/dom/make-element-child-stream';
import type ItemWithLifetimePool from '../../../../lib/ItemWithLifetimePool';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import selectorStream from '../../../../lib/dom/selectorStream';
import threadRowWatcher from '../threadRow/watcher';
import messageWatcher from '../message/watcher';

export default function watcher(
  root: Document=document,
  threadRowElPool: ?ItemWithLifetimePool<*>=null,
  messageElPool: ?ItemWithLifetimePool<*>=null
): Kefir.Stream<ElementWithLifetime> {
  const threadRowElStream: Kefir.Stream<ElementWithLifetime> = threadRowElPool ? threadRowElPool.items() : threadRowWatcher(root);
  const messageElStream: Kefir.Stream<ElementWithLifetime> = messageElPool ? messageElPool.items() : messageWatcher(root);

  const messageCardSelector = selectorStream([
    '*',
    '*',
    'section',
    '*',
    {$filter: el => el.style.display !== 'none'},
    '*'
  ]);

  const messageCards = messageElStream
    .flatMap(({el,removalStream}) => messageCardSelector(el).takeUntilBy(removalStream));

  const listCardSelector = selectorStream([
    '*',
    '[jsaction]',
    '[role=list][jsaction]',
    '*',
    '[role=listitem]'
  ]);

  const listCards = threadRowElStream
    .flatMap(({el,removalStream}) => listCardSelector(el).takeUntilBy(removalStream));

  return messageCards.merge(listCards)
    .filter(({el}) =>
      el.nodeName === 'DIV' && el.hasAttribute('tabindex') &&
      el.style.display !== 'none'
    );
}
