/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import Logger from '../../../../lib/logger';
import censorHTMLtree from '../../../../../common/censor-html-tree';
import type ItemWithLifetimePool from '../../../../lib/ItemWithLifetimePool';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import makeElementStreamMerger from '../../../../lib/dom/make-element-stream-merger';
import selectorStream from '../../../../lib/dom/selectorStream';
import threadWatcher from '../thread/watcher';

export default function watcher(
  root: Document=document,
  openedThreadPool: ?ItemWithLifetimePool<*>=null
): Kefir.Observable<ElementWithLifetime> {
  const openedThreads: Kefir.Observable<ElementWithLifetime> = openedThreadPool ? openedThreadPool.items() : threadWatcher(root);

  const inlineComposeSelector = selectorStream([
    '*',
    ':not([role=heading])',
    ':not([role=list])',
    '*',
    '[jsvs]',
    {$map(el) {
      // <2016-11-02 support
      const oldButton = _.find(el.children, child => child.nodeName === 'BUTTON');
      if (oldButton) return oldButton;

      const buttonEl = el.querySelector('div[jsaction="global.none"] > div[role=button]');
      if (buttonEl) return (buttonEl.parentElement:any);

      Logger.error(new Error("inline compose button not found"), {
        html: censorHTMLtree(el)
      });
    }},
    {$watch: {attributeFilter: ['style'], fn: el => el.style.display !== 'none'}},
    {$map: el => (el.parentElement:any)}
  ]);

  const inlineComposes = openedThreads
    .flatMap(({el,removalStream}) => inlineComposeSelector(el).takeUntilBy(removalStream));

  const regularComposeSelector = selectorStream([
    'div[id][jsaction]',
    'div[id][class]:not([role])',
    'div[class]',
    'div[id]',
    'div[jstcache][class]:not([aria-hidden], [tabindex])',
    {$map(el) {
      const composeEl = el.querySelector('div[role=dialog]');
      if (!composeEl) {
        Logger.error(new Error("compose dialog element not found"), {
          html: censorHTMLtree(el)
        });
      }
      return composeEl;
    }}
  ]);

  const regularComposes = regularComposeSelector((root.body:any))
    .map(({el,removalStream}) => ({
      // Needed so the element isn't removed before we see the element
      // re-added as full-screen.
      el, removalStream: removalStream.delay(1)
    }));

  const fullscreenComposeSelector = selectorStream([
    '[id][jsaction]',
    'div[id]:not([jsaction])',
    'div[tabindex][jsaction*="exit_full_screen"]',
    '*',
    '*',
    '*',
    '*',
    '*',
    '[role=dialog]'
  ]);

  const fullscreenComposes = fullscreenComposeSelector((root.body:any));

  return Kefir.merge([
    inlineComposes,
    Kefir.merge([
      regularComposes, fullscreenComposes
    ])
      .flatMap(makeElementStreamMerger())
  ])
    .filter(({el}) => !el.classList.contains('inboxsdk__drawer_view'));
}
