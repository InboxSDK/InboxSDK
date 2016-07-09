/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';

import Logger from '../logger';
import censorHTMLtree from '../../../common/censor-html-tree';
import arrayToLifetimes from '../../lib/array-to-lifetimes';
import delayIdle from '../../lib/delay-idle';

import type {ElementWithLifetime} from './make-element-child-stream';

type GenericParserResults = {
  elements: {[name: string]: ?HTMLElement};
  score: number;
  errors: Array<any>;
};

// Takes the watcher stream, augments it with the results from parser, logs
// errors, drops low scoring elements, and double-checks and augments watcher's
// results by using finder.
export default function detectionRunner<P: GenericParserResults>(
  {
    name, parser, watcher, finder, logError,
    root=document,
    interval=5000
  }: {
    name: string;
    parser: (el: HTMLElement) => P;
    watcher: ?(root: Document) => Kefir.Stream<ElementWithLifetime>;
    finder: (root: Document) => Array<HTMLElement>;
    logError: (err: Error, details?: any) => void;
    root?: Document;
    interval?: number|(liveElements: number, timeRunning: number) => number;
  }
): Kefir.Stream<ElementWithLifetime&{parsed: P}> {
  const startTime = Date.now();
  const watcherFoundElements: Set<HTMLElement> = new Set();
  const finderFoundElements: Set<HTMLElement> = new Set();
  const watcherFoundElementsMissedByFinder: Set<HTMLElement> = new Set();

  function addParse({el, removalStream}) {
    const parsed = parser(el);

    if (parsed.errors.length > 0) {
      logError(new Error(`detectionRunner(${name}) parse errors`), {
        score: parsed.score,
        errors: parsed.errors,
        html: censorHTMLtree(el)
      });
    }

    return {el, removalStream, parsed};
  }

  const watcherElements = !watcher ? Kefir.never() : watcher(root)
    .map(addParse)
    .filter(({parsed}) => parsed.score > 0.1) // TODO figure out a good scoring metric
    .filter(({el}) => {
      if (finderFoundElements.has(el)) {
        logError(new Error(`detectionRunner(${name}) watcher emitted element previously found by finder`), {
          html: censorHTMLtree(el)
        });
        return false;
      }
      if (watcherFoundElements.has(el)) {
        logError(new Error(`detectionRunner(${name}) watcher emitted element previously emitted by watcher`), {
          html: censorHTMLtree(el)
        });
        return false;
      }
      return true;
    })
    .map(event => {
      const {el, removalStream} = event;
      watcherFoundElements.add(el);
      removalStream.take(1).onValue(() => {
        watcherFoundElements.delete(el);
        watcherFoundElementsMissedByFinder.delete(el);
      });
      return event;
    });

  const finderElements = arrayToLifetimes(
    Kefir.repeat(() => {
      // TODO scale based on user activity
      const time = typeof interval === 'function' ?
        interval(
          watcherFoundElements.size + finderFoundElements.size,
          Date.now() - startTime
        ) : interval;
      return Kefir.later(time).flatMap(() => delayIdle(time));
    })
      .map(() => {
        const els = finder(root);

        watcherFoundElements.forEach(el => {
          if (!_.includes(els, el) && !watcherFoundElementsMissedByFinder.has(el)) {
            watcherFoundElementsMissedByFinder.add(el);
            logError(new Error(`detectionRunner(${name}) finder missed element found by watcher`), {
              html: censorHTMLtree(el)
            });
          }
        });

        return els.filter(el => !watcherFoundElements.has(el));
      })
  )
    .map(addParse)
    // Score filter here should be equal or stricter than watcher's check, or
    // else elements ignored by watcher will be found here and then trigger an
    // error which happens whenever this stream finds an element not in
    // watcher's stream.
    .filter(({parsed}) => parsed.score > 0.1)
    .map(event => {
      const {el, removalStream} = event;

      if (watcher) {
        logError(new Error(`detectionRunner(${name}) finder found element missed by watcher`), {
          html: censorHTMLtree(el)
        });
      }

      finderFoundElements.add(el);
      removalStream.take(1).onValue(() => {
        finderFoundElements.delete(el);
      });
      return event;
    });

  return Kefir.merge([watcherElements, finderElements]);
}
