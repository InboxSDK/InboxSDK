/* @flow */

import escapeRegExp from 'lodash/escapeRegExp';
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
      const checker = makeCssSelectorNodesChecker(selector, node.nodes);
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
      if (p.nodes.length === 0) {
        throw new Error(`Expected at least 1 selector in rule: ${item}`);
      }
      const checker = makeCssSelectorNodesChecker(item, p.nodes);
      const filterFn = ({el}) => checker(el);
      return stream => stream.flatMap(({el,removalStream}) =>
        makeElementChildStream(el)
          .filter(filterFn)
          .takeUntilBy(removalStream)
      );
    } else if (item.$or) {
      const items = item.$or;
      const transformers = items.map(selectorStream);
      return stream => Kefir.merge(transformers.map(fn => {
        return stream.flatMap(({el,removalStream}) => fn(el));
      }));
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
