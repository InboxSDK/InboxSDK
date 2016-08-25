/* @flow */

import _ from 'lodash';
import getRoot from './getRoot';

// Gets all attributes mentioned in a selector. Throws an error if the selector
// depends on qualities other than attributes. This method is used by
// selectorStream's $watch feature and errors if someone tries to pass a
// selector that depends on a quality that selectorStream can't watch with a
// mutation observer.
export default function getRelevantAttributeList(node: Object): string[] {
  switch (node.type) {
    case 'root':
    case 'selector':
      return _.flatMap(node.nodes, getRelevantAttributeList);
    case 'attribute':
      return [node.attribute];
    case 'class':
      return ['class'];
    case 'pseudo':
      switch (node.value) {
      case ':not':
        return getRelevantAttributeList({...node, type: 'root'});
      }
      throw new Error(`Unsupported css pseudo selector(${node.value}) while looking for attributes in selector: ${getRoot(node).toString()}`);
  }
  throw new Error(`Found css node type(${node.type}) while looking for attributes in selector: ${getRoot(node).toString()}`);
}
