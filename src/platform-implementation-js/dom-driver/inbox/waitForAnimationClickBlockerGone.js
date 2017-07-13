/* @flow */

import once from 'lodash/once';
import find from 'lodash/find';
import Kefir from 'kefir';

import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';

const getAnimationClickBlocker: () => HTMLElement = once(() =>
  find(((document.body:any):HTMLElement).children, el => {
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

  // Wait for (the animationClickBlocker to appear OR 150 ms to pass), then
  // wait for the animationClickBlocker to disappear.
  return makeMutationObserverChunkedStream(el, {attributes: true})
    .toProperty(() => undefined)
    .filter(() => window.getComputedStyle(el).display !== 'none')
    .merge(Kefir.later(150))
    .take(1)
    .flatMap(() =>
      makeMutationObserverChunkedStream(el, {attributes: true})
        .toProperty(() => undefined)
    )
    .filter(() => window.getComputedStyle(el).display === 'none')
    .map(() => undefined)
    .take(1);
}
