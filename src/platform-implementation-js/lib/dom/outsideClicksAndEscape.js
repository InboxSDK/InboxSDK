/* @flow */

import Kefir from 'kefir';
import fromEventTargetCapture from '../from-event-target-capture';
import parentNodes from './parentNodes';

export default function outsideClicksAndEscape(elements: HTMLElement[]): Kefir.Observable<null> {
  return Kefir.merge([
    fromEventTargetCapture(document, 'click'),
    // We modify the focus event on document sometimes, so we listen for
    // it on body so our modifications can happen first.
    fromEventTargetCapture((document.body:any), 'focus')
  ])
    .filter(event =>
      !event.shouldIgnore &&
      (event.isTrusted || (process.env.NODE_ENV === 'test' && event.__testAllow)) &&
      elements.every(el => {
        for (let node of parentNodes(event.target)) {
          if (node === el) return false;
        }
        return true;
      })
    )
    .merge(
      Kefir.fromEvents(document, 'keydown')
        .filter(e => e.key ? e.key === 'Escape' : e.which === 27)
        .map(e => {
          e.preventDefault();
          e.stopPropagation();
          return e;
        })
    )
    .map(() => {
      if (process.env.NODE_ENV !== 'production') {
        const allElsStillInPage = elements.every(el => document.contains(el));
        if (!allElsStillInPage) {
          console.error('outsideClicksAndEscape not unsubscribed from when elements were removed from the page'); //eslint-disable-line no-console
        }
      }
      return null;
    });
}
