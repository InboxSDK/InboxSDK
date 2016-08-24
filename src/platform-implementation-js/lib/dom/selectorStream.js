/* @flow */

import escapeRegExp from 'lodash/escapeRegExp';
import constant from 'lodash/constant';
import Kefir from 'kefir';
import cssParser from 'postcss-selector-parser';

import makeElementChildStream from './make-element-child-stream';
import makeMutationObserverChunkedStream from './make-mutation-observer-chunked-stream';
import type {ElementWithLifetime} from './make-element-child-stream';

export type SelectorItem = string
  | {$or: Array<Selector>}
  | {$log: string}
  | {$watch: string}
;

export type Selector = Array<SelectorItem>;

const cssProcessor = cssParser();

function makeCssSelectorNodeChecker(selector: string, node: Object): (el: HTMLElement) => boolean {
  switch (node.type) {
  case 'root': {
    const checkers = node.nodes
      .map(node => makeCssSelectorNodeChecker(selector, node));
    return el => checkers.some(checker => checker(el));
  }
  case 'selector': {
    const checkers = node.nodes
      .map(node => makeCssSelectorNodeChecker(selector, node));
    return el => checkers.every(checker => checker(el));
  }
  case 'universal':
    return el => true;
  case 'tag':
    return el => el.nodeName === node.value.toUpperCase();
  case 'class':
    return el => el.classList.contains(node.value);
  case 'attribute':
    switch (node.operator) {
    case undefined:
      return el => el.hasAttribute(node.attribute);
    case '^=': {
      const r = new RegExp('^'+escapeRegExp(node.raws.unquoted));
      return el => r.test(el.getAttribute(node.attribute));
    }
    case '*=': {
      const r = new RegExp(escapeRegExp(node.raws.unquoted));
      return el => r.test(el.getAttribute(node.attribute));
    }
    case '$=': {
      const r = new RegExp(escapeRegExp(node.raws.unquoted)+'$');
      return el => r.test(el.getAttribute(node.attribute));
    }
    case '=':
      return el => el.getAttribute(node.attribute) === node.raws.unquoted;
    }
    throw new Error(`Unsupported attribute operator(${node.operator}) in selector: ${selector}`);
  case 'pseudo':
    switch (node.value) {
    case ':not':
      const checker = makeCssSelectorNodeChecker(selector, {...node, type: 'root'});
      return el => !checker(el);
    }
    throw new Error(`Unsupported css pseudo selector(${node.value}) in selector: ${selector}`);
  }
  throw new Error(`Unsupported css node type(${node.type}) in selector: ${selector}`);
}

export default function selectorStream(selector: Selector): (el: HTMLElement) => Kefir.Stream<ElementWithLifetime> {
  type Transformers = Array<(stream: Kefir.Stream<ElementWithLifetime>) => Kefir.Stream<ElementWithLifetime>>;
  const transformers: Transformers = selector.map(item => {
    if (typeof item === 'string') {
      const p = cssProcessor.process(item).res;
      const checker = makeCssSelectorNodeChecker(item, p);
      const filterFn = ({el}) => checker(el);
      return stream => stream.flatMap(({el,removalStream}) =>
        makeElementChildStream(el)
          .filter(filterFn)
          .takeUntilBy(removalStream)
      );
    } else if (item.$or) {
      const transformers = item.$or.map(selectorStream);
      return stream => Kefir.merge(transformers.map(fn =>
        stream.flatMap(({el,removalStream}) => fn(el).takeUntilBy(removalStream))
      ));
    } else if (item.$watch) {
      const {$watch} = (item:any);
      const p = cssProcessor.process($watch).res;
      const checker = makeCssSelectorNodeChecker($watch, p);
      return stream => stream.flatMap(({el,removalStream}) => {
        const expanded = makeMutationObserverChunkedStream(el, {
            attributes: true
          })
          .toProperty(()=>null)
          .map(() => checker(el))
          .takeUntilBy(removalStream)
          .beforeEnd(()=>false)
          .skipDuplicates();
        const opens = expanded.filter(x => x);
        const closes = expanded.filter(x => !x);
        return opens.map(constant({el, removalStream:closes.changes()}));
      });
    } else if (item.$log) {
      const {$log} = (item:any);
      return stream => stream.map(event => {
        console.log($log, event.el);
        return event;
      });
    }
    throw new Error(`Invalid selector item: ${JSON.stringify(item)}`);
  });
  return el => {
    return transformers.reduce(
      (stream, fn) => fn(stream),
      Kefir.constant({el, removalStream: Kefir.never()})
    );
  };
}
