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
import messageWatcher from '../message/watcher';

export default function watcher(
  root: Document=document,
  openedThreads: ?Kefir.Stream<ElementWithLifetime>=null,
  messages: ?Kefir.Stream<ElementWithLifetime>=null
): Kefir.Stream<ElementWithLifetime> {
  if (!openedThreads) openedThreads = threadWatcher(root);
  if (!messages) messages = messageWatcher(root, openedThreads);

  return messages
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.nodeName === 'SECTION')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.style.display !== 'none')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.hasAttribute('tabindex') && el.hasAttribute('jsaction'));
}
