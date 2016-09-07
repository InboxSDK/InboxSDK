/* @flow */

import _ from 'lodash';
import type Kefir from 'kefir';

import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';

const getAnimationClickBlocker: () => HTMLElement = _.once(() =>
  _.find(document.body.children, el => {
    const c = window.getComputedStyle(el);
    return c.position === 'fixed' &&
      parseFloat(c.top) === 0 &&
      parseFloat(c.bottom) === 0 &&
      parseFloat(c.left) === 0 &&
      parseFloat(c.right) === 0;
  })
);

export default function waitForAnimationClickBlockerGone(): Kefir.Observable<void> {
  const el = getAnimationClickBlocker();
  return makeMutationObserverChunkedStream(el, {attributes: true})
    .map(() => undefined)
    .toProperty(() => undefined)
    .filter(() => window.getComputedStyle(el).display === 'none')
    .take(1);
}
