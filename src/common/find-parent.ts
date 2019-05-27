export default function findParent(
  el: HTMLElement,
  cb: (el: Element) => boolean
): HTMLElement | null {
  let candidate = el.parentElement;
  while (candidate) {
    if (cb(candidate)) {
      return candidate;
    }
    candidate = candidate.parentElement;
  }
  return null;
}
