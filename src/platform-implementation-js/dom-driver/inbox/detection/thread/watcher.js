/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import Logger from '../../../../lib/logger';
import streamWaitFor from '../../../../lib/stream-wait-for';
import delayAsap from '../../../../lib/delay-asap';
import censorHTMLtree from '../../../../../common/censor-html-tree';
import makeElementChildStream from '../../../../lib/dom/make-element-child-stream';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';

import threadRowWatcher from '../threadRow/watcher';

export default function watcher(root: Document=document, threadRowElStream: ?Kefir.Stream<ElementWithLifetime>=null): Kefir.Stream<ElementWithLifetime> {
  if (!threadRowElStream) threadRowElStream = threadRowWatcher(root);

  const openedThreads = threadRowElStream
    .flatMap(({el,removalStream}) => {
      // Only emit the element when it is opened, and trigger the removalStream
      // when it is closed.
      const expanded = makeMutationObserverChunkedStream(el, {
        attributes: true, attributeFilter:['aria-expanded', 'class']
      })
        .toProperty(()=>null)
        .map(() =>
          el.getAttribute('aria-expanded') === 'true' || el.classList.contains('scroll-list-item-open')
        )
        .takeUntilBy(removalStream)
        .beforeEnd(()=>false)
        .skipDuplicates();
      const opens = expanded.filter(x => x);
      const closes = expanded.filter(x => !x);
      return opens.map(_.constant({el, removalStream:closes.changes()}));
    });

  return openedThreads;
}
