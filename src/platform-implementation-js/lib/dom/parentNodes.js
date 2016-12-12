/* @flow */

export default function *parentNodes(node: Node): Iterable<Node> {
  do {
    yield (node: Node);
  } while ((node = (node: any).rfaAnchor || (node: any)._logicalParent || (node: any).parentNode));
}
