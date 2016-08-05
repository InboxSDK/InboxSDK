/* @flow */

import Kefir from 'kefir';
import fromEventTargetCapture from '../from-event-target-capture';

export default function outsideClicksAndEscape(elements: HTMLElement[]): Kefir.Stream<null> {
  return Kefir.merge([
    fromEventTargetCapture(document, 'click'),
    // We modify the focus event on document sometimes, so we listen for
    // it on body so our modifications can happen first.
    fromEventTargetCapture(document.body, 'focus')
  ])
    .filter(event =>
      !event.shouldIgnore &&
      event.isTrusted &&
      elements.every(el => !el.contains(event.target))
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
          console.error('outsideClicksAndEscape not unsubscribed from when elements were removed from the page');
        }
      }
      return null;
    });
}
