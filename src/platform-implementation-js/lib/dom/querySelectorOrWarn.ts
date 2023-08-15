export function querySelectorOrWarn<T extends Element>(
  el: Document | DocumentFragment | Element,
  selector: string
): T | null {
  const result = el.querySelector<T>(selector);

  if (result) {
    return result;
  }

  console.warn('element with selector not found:', selector);

  return null;
}
