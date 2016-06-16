/* @flow */

import Kefir from 'kefir';

import Logger from '../logger';
import censorHTMLtree from '../../../common/censor-html-tree';

import type {ElementWithLifetime} from './make-element-child-stream';

type GenericParserResults = {
  elements: {[name: string]: ?HTMLElement};
  score: number;
  errors: Array<any>;
};

export default function detectionRunner<P: GenericParserResults>(
  {
    name, parser, watcher, finder,
    root=document,
    logError=(err, details) => Logger.error(err, details)
  }: {
    name: string;
    parser: (el: HTMLElement) => P;
    watcher: (root: Document) => Kefir.Stream<ElementWithLifetime>;
    finder: (root: Document) => Array<HTMLElement>;
    root?: Document;
    logError?: (err: Error, details?: any) => void;
  }
): Kefir.Stream<ElementWithLifetime&{parsed: P}> {
  // TODO merge in finder's results on an interval
  return watcher(root)
    .map(({el, removalStream}) => {
      const parsed = parser(el);

      if (parsed.errors.length > 0) {
        logError(new Error(`detectionRunner errors: ${name}`), {
          score: parsed.score,
          errors: parsed.errors,
          html: censorHTMLtree(el)
        });
      }

      return {el, removalStream, parsed};
    })
    // .filter(({parsed}) => parsed.score < 0.5)
}
