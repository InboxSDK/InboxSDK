/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import streamWaitFor from '../../lib/stream-wait-for';
import delayAsap from '../../lib/delay-asap';
import censorHTMLtree from '../../../common/censor-html-tree';
import makeElementChildStream from '../../lib/dom/make-element-child-stream';
import elementViewMapper from '../../lib/dom/element-view-mapper';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';
import InboxComposeView from './views/inbox-compose-view';
import type InboxDriver from './inbox-driver';
import type {ComposeViewDriver} from '../../driver-interfaces/compose-view-driver';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver): Kefir.Stream<ComposeViewDriver> {
  return Kefir.merge([
    // Regular
    streamWaitFor(() => {
      const els = document.querySelectorAll('body > div[id][jsaction] > div[id][class]:not([role]) > div[class] > div[id]');
      return els.length === 1 ? els[0] : null;
    })
      .flatMap(makeElementChildStream)
      .filter(({el}) => el.hasAttribute('jsaction') && el.hasAttribute('jstcache'))
      .flatMap(event =>
        // ignore the composes that get removed immediately
        delayAsap(event)
          .takeUntilBy(event.removalStream)
      )
      .map(({el,removalStream}) => {
        const composeEl = el.querySelector('div[role=dialog]');
        if (!composeEl) {
          driver.getLogger().error(new Error("compose dialog element not found"), {
            html: censorHTMLtree(el)
          });
          return null;
        }
        return {el:composeEl,removalStream};
      })
      .filter(Boolean),
    // Inline
    streamWaitFor(() => document.querySelector('[role=main]'))
      .flatMap(makeElementChildStream)
      .filter(({el}) => el.getAttribute('role') === 'application')
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.getAttribute('role') === 'list')
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.classList.contains('scroll-list-section-body'))
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      // each el is a bundle now
      .flatMap(({el,removalStream}) => {
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
      })
      // each el is an opened bundle now
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.children.length>0)
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.children.length>0 && el.getAttribute('role') !== 'heading')
      .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
      .filter(({el}) => el.getAttribute('role') !== 'list')
      .map(({el,removalStream}) =>
        ({el: el.querySelector('div[jslog] > div[jsvs]'), removalStream})
      )
      .filter(({el}) => el)
      .flatMap(({el,removalStream}) => {
        // We've got the compose element now, but it could be closed. Let's
        // transform the stream to only get opened inline composes.
        const buttonEl = _.find(el.children, child => child.nodeName === 'BUTTON');
        if (!buttonEl) {
          driver.getLogger().error(new Error("inline compose button not found"), {
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
  ])
    .map(elementViewMapper((el: HTMLElement) =>
      new InboxComposeView(driver, el)
    ));
}

export default function getComposeViewDriverStream(driver: InboxDriver): Kefir.Stream<ComposeViewDriver> {
  return impStream.flatMapLatest(_imp => _imp(driver));
}
