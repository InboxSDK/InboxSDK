export class SelectorError extends Error {
  name = 'SelectorError';

  constructor(selector: string, options?: { cause: unknown }) {
    super(`Failed to find element with selector: ${selector}`, options);
  }
}

export default function querySelector(
  el: Document | DocumentFragment | Element,
  selector: string,
): HTMLElement {
  const r = el.querySelector(selector);
  if (!r) throw new SelectorError(selector);
  return r as HTMLElement;
}
