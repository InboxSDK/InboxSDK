/** Refers to {@link chrome} or `browser` in firefox */
export const browser = globalThis.chrome || (globalThis as any).browser;

if (!browser) {
  throw new Error('chrome or browser not available in current context.');
}

export function getExtensionId() {
  try {
    return browser.runtime.id;
  } catch (error) {
    console.error('Failed to get extension id', error);
  }
}
