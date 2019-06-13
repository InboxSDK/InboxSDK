export default function* parentNodes(node: Node): Iterable<Node> {
  do {
    yield node as Node;
  } while (
    (node =
      (node as any).rfaAnchor ||
      (node as any)._logicalParent ||
      (node as any).parentNode)
  );
}
