/* @flow */

import _ from 'lodash';
import getRoot from './getRoot';

export default function makeCssSelectorChecker(node: Object): (el: HTMLElement) => boolean {
  switch (node.type) {
  case 'root': {
    const checkers = node.nodes
      .map(makeCssSelectorChecker);
    return el => checkers.some(checker => checker(el));
  }
  case 'selector': {
    const checkers = node.nodes
      .map(makeCssSelectorChecker);
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
      const r = new RegExp('^'+_.escapeRegExp(node.raws.unquoted));
      return el => r.test(el.getAttribute(node.attribute));
    }
    case '*=': {
      const r = new RegExp(_.escapeRegExp(node.raws.unquoted));
      return el => r.test(el.getAttribute(node.attribute));
    }
    case '$=': {
      const r = new RegExp(_.escapeRegExp(node.raws.unquoted)+'$');
      return el => r.test(el.getAttribute(node.attribute));
    }
    case '=':
      return el => el.getAttribute(node.attribute) === node.raws.unquoted;
    }
    throw new Error(`Unsupported attribute operator(${node.operator}) in selector: ${getRoot(node).toString()}`);
  case 'pseudo':
    switch (node.value) {
    case ':not':
      const checker = makeCssSelectorChecker({...node, type: 'root'});
      return el => !checker(el);
    }
    throw new Error(`Unsupported css pseudo selector(${node.value}) in selector: ${getRoot(node).toString()}`);
  }
  throw new Error(`Unsupported css node type(${node.type}) in selector: ${getRoot(node).toString()}`);
}
