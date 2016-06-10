/* @flow */

export default function querySelectorOne(root: Element, selector: string): HTMLElement {
  const els = root.querySelectorAll(selector);
  if (els.length !== 1) {
    throw new Error(`Found ${els.length} elements when expecting 1 using selector ${JSON.stringify(selector)}`);
  }
  return els[0];
}
