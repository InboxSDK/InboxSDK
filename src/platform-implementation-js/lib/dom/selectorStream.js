/* @flow */

import Kefir from 'kefir';
import cssParser from 'postcss-selector-parser';

import makeElementChildStream from './make-element-child-stream';
import type {ElementWithLifetime} from './make-element-child-stream';

export type SelectorItem = string
  | {$or: Array<Selector>}
  | {$watch: string}
;

export type Selector = Array<SelectorItem>;

const cssProcessor = cssParser();

function makeCssSelectorNodesChecker(selector: string, nodes: Array<Object>): (el: HTMLElement) => boolean {
  const checkers = nodes
    .filter(node => node.type !== 'universal')
    .map(node => makeCssSelectorNodeChecker(selector, node));
  return el => checkers.every(fn => fn(el));
}

function makeCssSelectorNodeChecker(selector: string, node: Object): (el: HTMLElement) => boolean {
  switch (node.type) {
  case 'selector':
    return makeCssSelectorNodesChecker(selector, node.nodes);
  case 'tag':
    return el => el.nodeName === node.value.toUpperCase();
  case 'class':
    return el => el.classList.contains(node.value);
  case 'attribute':
    switch (node.operator) {
    case '=':
      return el => el.getAttribute(node.attribute) === node.value;
    }
    throw new Error(`Unsupported attribute operator(${node.operator}) in selector: ${selector}`);
  case 'pseudo':
    switch (node.value) {
    case ':not':
      const checker = makeCssSelectorNodesChecker(selector, node.nodes);
      return el => !checker(el);
    }
    throw new Error(`Unsupported css pseudo selector(${node.value}) in selector: ${selector}`);
  }
  throw new Error(`Unsupported css node type(${node.type}) in selector: ${selector}`);
}

export default function selectorStream(el: HTMLElement, selector: Selector): Kefir.Stream<ElementWithLifetime> {
  return selector.reduce((stream, item) => {
    if (typeof item === 'string') {
      const p = cssProcessor.process(item).res;
      if (p.nodes.length === 0) {
        throw new Error(`Expected at least 1 selector in rule: ${item}`);
      }
      const checker = makeCssSelectorNodesChecker(item, p.nodes);
      const filterFn = ({el}) => checker(el);
      return stream.flatMap(({el,removalStream}) =>
        makeElementChildStream(el)
          .filter(filterFn)
          .takeUntilBy(removalStream)
      );
    }
    throw new Error(`Invalid selector item: ${JSON.stringify(item)}`);
  }, Kefir.constant({el, removalStream: Kefir.never()}));
}
