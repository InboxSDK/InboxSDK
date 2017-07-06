/* @flow */

export default function isNodeInRange(node: ?Node, range: ?Range): boolean {
  if (!range) {
    return false;
  }

  if (!node) {
    return false;
  }

  const newRange = document.createRange();
  newRange.selectNode(node);

  return newRange.compareBoundaryPoints(Range.START_TO_END, range) < 1 && range.compareBoundaryPoints(Range.START_TO_END, newRange) < 1;
}
