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

export default function watcher(
  root: Document=document,
  openedThreads: ?Kefir.Stream<ElementWithLifetime>=null
): Kefir.Stream<ElementWithLifetime> {
  if (!openedThreads) openedThreads = threadWatcher(root);

  const messages = openedThreads
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') !== 'heading')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'list')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) =>
      el.getAttribute('role') === 'listitem' && el.hasAttribute('data-msg-id')
    );

  return messages;
}
