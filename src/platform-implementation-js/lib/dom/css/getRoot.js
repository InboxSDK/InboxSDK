/* @flow */

export default function getRoot(node: Object): Object {
  while (node.parent) {
    node = node.parent;
  }
  return node;
}
