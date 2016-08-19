/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import Logger from '../../../../lib/logger';
import streamWaitFor from '../../../../lib/stream-wait-for';
import censorHTMLtree from '../../../../../common/censor-html-tree';
import makeElementChildStream from '../../../../lib/dom/make-element-child-stream';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';

export default function watcher(
  root: Document=document
): Kefir.Stream<ElementWithLifetime> {
  return makeElementChildStream(root.body)
    .filter(({el}) =>
      el.nodeName === 'IFRAME' && !el.hasAttribute('src') &&
      el.hasAttribute('id') && el.hasAttribute('frameborder')
    )
    .map(({el, removalStream}) => ({
      el: ((el: any).contentDocument.body: HTMLElement),
      removalStream
    }))
    .flatMap(({el,removalStream}) => makeElementChildStream(el).takeUntilBy(removalStream))
    .filter(({el}) =>
      el.nodeName === 'DIV' && el.hasAttribute('aria-label') &&
      el.getAttribute('role') === 'dialog'
    )
    .flatMap(({el,removalStream}) => {
      // Only emit the element when it is opened, and trigger the removalStream
      // when it is closed.
      const expanded = makeMutationObserverChunkedStream(el, {
          attributes: true, attributeFilter:['aria-hidden']
        })
        .toProperty(()=>null)
        .map(() => el.getAttribute('aria-hidden') !== 'true')
        .takeUntilBy(removalStream)
        .beforeEnd(()=>false)
        .skipDuplicates();
      const opens = expanded.filter(x => x);
      const closes = expanded.filter(x => !x);
      return opens.map(_.constant({el, removalStream:closes.changes()}));
    });
}
