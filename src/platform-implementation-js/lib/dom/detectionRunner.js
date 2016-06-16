/* @flow */

import Kefir from 'kefir';

import Logger from '../logger';

import type {ElementWithLifetime} from './make-element-child-stream';

type GenericParserResults = {
  elements: {[name: string]: ?HTMLElement};
  score: number;
  errors: Array<any>;
};

export default function detectionRunner<P: GenericParserResults>(
  {parser, watcher, finder, root}: {
    parser: (el: HTMLElement) => P;
    watcher: (root: Document) => Kefir.Stream<ElementWithLifetime>;
    finder: (root: Document) => Array<HTMLElement>;
    root: Document;
  }
): Kefir.Stream<ElementWithLifetime&{parsed: P}> {
  // TODO merge in finder's results on an interval
  return watcher(root)
    .map(({el, removalStream}) => {
      const parsed = parser(el);
      return {el, removalStream, parsed};
    });
}
