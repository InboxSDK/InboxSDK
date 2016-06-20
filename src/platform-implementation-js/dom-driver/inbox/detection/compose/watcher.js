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

const impStream = udKefir(module, imp);

function imp(root: Document): Kefir.Stream<ElementWithLifetime> {
  const openedBundlesAndThreads = streamWaitFor(() => root.querySelector('[role=main]'))
    .flatMap(makeElementChildStream)
    .filter(({el}) => el.getAttribute('role') === 'application')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'list')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.classList.contains('scroll-list-section-body'))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'listitem')
    // each el is a bundle or thread now
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

  const openedTopLevelThreads = openedBundlesAndThreads
    .filter(({el}) => el.getAttribute('aria-multiselectable') !== 'true');

  const openedThreadsInBundles = openedBundlesAndThreads
    .filter(({el}) => el.getAttribute('aria-multiselectable') === 'true')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'list')
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => !el.hasAttribute('id'))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'listitem')
    .flatMap(({el,removalStream}) => {
      // Only emit the element when it is opened, and trigger the removalStream
      // when it is closed.
      const expanded = makeMutationObserverChunkedStream(el, {
          attributes: true, attributeFilter:['class']
        })
        .toProperty(()=>null)
        .map(() => el.classList.contains('scroll-list-item-open'))
        .takeUntilBy(removalStream)
        .beforeEnd(()=>false)
        .skipDuplicates();
      const opens = expanded.filter(x => x);
      const closes = expanded.filter(x => !x);
      return opens.map(_.constant({el, removalStream:closes.changes()}));
    });

  const openedThreads = Kefir.merge([
    openedTopLevelThreads,
    openedThreadsInBundles
  ]);

  return Kefir.merge([
    // Regular
    streamWaitFor(() => {
      const els = root.querySelectorAll('body > div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id]');
      // TODO We need to handle the case where there are multiple elements that
      // match the above selector, but the wrong element is added to the page
      // first, and this wait-for ends before the correct element is present.
      return els;
    })
      .flatMap(els => Kefir.merge(_.map(els, makeElementChildStream)))
      .filter(({el}) => el.hasAttribute('jsaction') && el.hasAttribute('jstcache'))
      .flatMap(event =>
        // ignore the composes that get removed immediately
        delayAsap(event)
          .takeUntilBy(event.removalStream)
      )
      .map(({el,removalStream}) => {
        const composeEl = el.querySelector('div[role=dialog]');
        if (!composeEl) {
          Logger.error(new Error("compose dialog element not found"), {
            html: censorHTMLtree(el)
          });
          return (null: any);
        }
        return {el:composeEl,removalStream};
      })
      .filter(Boolean),
    // Fullscreen
    makeElementChildStream(root.body)
      .filter(({el}) => el.id && el.hasAttribute('jsaction'))
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.nodeName === 'DIV' && el.id && !el.hasAttribute('jsaction'))
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.nodeName === 'DIV' && el.hasAttribute('tabindex') && _.includes(el.getAttribute('jsaction'), 'exit_full_screen'))
      .map(({el, removalStream}) => ({
        el: el.querySelector('div[role=dialog]'), removalStream
      }))
      .filter(({el}) => el),
    // Inline
    openedThreads
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.children.length>0)
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.children.length>0 && el.getAttribute('role') !== 'heading')
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.getAttribute('role') !== 'list')
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.hasAttribute('jslog'))
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.hasAttribute('jsvs'))
      .flatMap(({el,removalStream}) => {
        // We've got the compose element now, but it could be closed. Let's
        // transform the stream to only get opened inline composes.
        const buttonEl = _.find(el.children, child => child.nodeName === 'BUTTON');
        if (!buttonEl) {
          Logger.error(new Error("inline compose button not found"), {
            html: censorHTMLtree(el)
          });
          return Kefir.never();
        }
        const expanded = makeMutationObserverChunkedStream(buttonEl, {
            attributes: true, attributeFilter:['style']
          })
          .toProperty(()=>null)
          .map(() => buttonEl.style.display !== 'none')
          .takeUntilBy(removalStream)
          .beforeEnd(()=>false)
          .skipDuplicates();
        const opens = expanded.filter(x => x);
        const closes = expanded.filter(x => !x);
        return opens.map(_.constant({el, removalStream:closes.changes()}));
      })
  ]);
}

export default function watcher(root: Document=document): Kefir.Stream<ElementWithLifetime> {
  return impStream.flatMapLatest(_imp => _imp(root));
}
