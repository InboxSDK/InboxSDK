/* @flow */

export default function findParent(el: HTMLElement, cb: (el: Element) => boolean): ?HTMLElement {
  let candidate = el.parentElement;
  while (candidate) {
    if (cb(candidate)) return ((candidate: any): HTMLElement);
    candidate = candidate.parentElement;
  }
  return null;
}
