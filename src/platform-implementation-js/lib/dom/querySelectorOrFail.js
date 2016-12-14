/* @flow */

export default function querySelector(el: Document|DocumentFragment|Element, selector: string): HTMLElement {
  const r = el.querySelector(selector);
  if (!r) throw new Error(`Failed to find element with selector: ${selector}`);
  return r;
}
