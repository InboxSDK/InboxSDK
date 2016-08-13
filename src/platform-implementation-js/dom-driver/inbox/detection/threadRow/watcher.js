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

export default function watcher(root: Document=document): Kefir.Stream<ElementWithLifetime> {
  const mainTopAncestor = makeElementChildStream(root.body)
    .filter(({el}) => el.id && el.hasAttribute('jsaction'));

  const mainsCommonAncestors = mainTopAncestor
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) =>
      el.nodeName === 'DIV' && el.id && el.hasAttribute('jsaction') && !el.hasAttribute('role')
    )
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream));

  const mainMain = mainsCommonAncestors
    .filter(({el}) => el.getAttribute('role') === 'main');

  const searchMain = mainsCommonAncestors
    .filter(({el}) => !el.hasAttribute('role'))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'main');

  const allMains = mainMain.merge(searchMain);

  const bundlesAndThreads = allMains
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'application')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'list')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.classList.contains('scroll-list-section-body'))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'listitem');

  const topLevelBundles = bundlesAndThreads
    .filter(({el}) => el.getAttribute('aria-multiselectable') === 'true');

  const topLevelThreads = bundlesAndThreads
    .filter(({el}) => el.getAttribute('aria-multiselectable') !== 'true');

  const openedBundles = topLevelBundles
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

  const threadsInBundles = openedBundles
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'list')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => !el.hasAttribute('id'))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'listitem');

  const threadRows = Kefir.merge([
    topLevelThreads,
    threadsInBundles
  ]);

  return threadRows;
}
