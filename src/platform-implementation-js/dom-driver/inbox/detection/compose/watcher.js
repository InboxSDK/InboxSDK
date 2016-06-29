/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import Logger from '../../../../lib/logger';
import streamWaitFor from '../../../../lib/stream-wait-for';
import delayAsap from '../../../../lib/delay-asap';
import censorHTMLtree from '../../../../../common/censor-html-tree';
import _makeElementChildStream from '../../../../lib/dom/make-element-child-stream';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import makeElementStreamMerger from '../../../../lib/dom/make-element-stream-merger';

const impStream = udKefir(module, imp);

function imp(root: Document): Kefir.Stream<ElementWithLifetime> {
  const debugLogging = true;
  const makeElementChildStream = debugLogging ? function(el) {
    // Add an attribute to watched elements that we can see in reported html to
    // help debugging the watcher.
    return _makeElementChildStream(el).merge(Kefir.stream(() => {
      el.setAttribute('data-compose-mecs', 'true');
      return () => {
        el.removeAttribute('data-compose-mecs');
      };
    }));
  } : _makeElementChildStream;

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

  const openedBundlesAndThreads = allMains
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
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

  const inlineComposes = openedThreads
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') !== 'heading')
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
    });

  const regularComposes = streamWaitFor(() => {
    const els = root.querySelectorAll('body > div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id]');
    // TODO We need to handle the case where there are multiple elements that
    // match the above selector, but the wrong element is added to the page
    // first, and this wait-for ends before the correct element is present.
    return els;
  })
    .flatMap(els => Kefir.merge(_.map(els, makeElementChildStream)))
    .filter(({el}) =>
      el.hasAttribute('jstcache') && el.className && el.nodeName === 'DIV' &&
      !el.hasAttribute('aria-hidden') && !el.hasAttribute('tabindex')
    )
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
      return {
        el: composeEl,
        // Needed so the element isn't removed before we see the element
        // re-added as full-screen.
        removalStream: removalStream.delay(1)
      };
    })
    .filter(Boolean);

  const fullscreenComposes = mainTopAncestor
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.nodeName === 'DIV' && el.id && !el.hasAttribute('jsaction'))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) =>
      el.nodeName === 'DIV' && el.hasAttribute('tabindex') &&
      _.includes(el.getAttribute('jsaction'), 'exit_full_screen')
    )
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) => el.getAttribute('role') === 'dialog');

  return Kefir.merge([
    inlineComposes,
    Kefir.merge([
      regularComposes, fullscreenComposes
    ])
      .flatMap(makeElementStreamMerger())
  ]);
}

export default function watcher(root: Document=document): Kefir.Stream<ElementWithLifetime> {
  return impStream.flatMapLatest(_imp => _imp(root));
}
