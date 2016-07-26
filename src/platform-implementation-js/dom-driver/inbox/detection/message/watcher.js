/* @flow */

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
import threadWatcher from '../thread/watcher';

export default function watcher(root: Document=document): Kefir.Stream<ElementWithLifetime> {
  const openedThreads = threadWatcher(root);

  const messages = openedThreads
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') !== 'heading')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'list')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) =>
      el.getAttribute('role') === 'listitem' && el.hasAttribute('data-msg-id')
    )
    .flatMap(({el,removalStream}) => {
      // Only emit the element when it is opened, and trigger the removalStream
      // when it is closed.
      const expanded = makeMutationObserverChunkedStream(el, {
          attributes: true, attributeFilter:['aria-expanded']
        })
        .toProperty(()=>null)
        .map(() => el.getAttribute('aria-expanded') === 'true')
        .takeUntilBy(removalStream)
        .beforeEnd(()=>false)
        .skipDuplicates();
      const opens = expanded.filter(x => x);
      const closes = expanded.filter(x => !x);
      return opens.map(_.constant({el, removalStream:closes.changes()}));
    });

  return messages;
}
