// Tests for the More menu fallback selector logic (#1280).
// The #getOpenMoreMenu() method relies on specific Gmail DOM selectors that
// Gmail changes periodically. These tests validate the fallback logic added
// to find the open More menu even when the dated selectors no longer match.

// Replicate the fallback selector patterns from #getOpenMoreMenu.
// Since the method is private and bound to GmailMessageView's element/state,
// we test the selector logic directly against document.body.
const FALLBACK_SELECTOR = '.J-M[aria-haspopup=true]';
const BROAD_SELECTOR = 'div[role=menu], .J-M';

function makeVisible(el: HTMLElement) {
  Object.defineProperty(el, 'offsetHeight', { value: 20, configurable: true });
  Object.defineProperty(el, 'offsetWidth', { value: 100, configurable: true });
}

function findVisibleMenu(selector: string): HTMLElement | null {
  const elements = document.body.querySelectorAll<HTMLElement>(selector);
  for (const el of elements) {
    if (el.offsetHeight > 0 && el.offsetWidth > 0) {
      return el;
    }
  }
  return null;
}

describe('getOpenMoreMenu fallback selector logic', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // ── Fallback 1: .J-M[aria-haspopup=true] with visibility check ──

  test('returns visible .J-M[aria-haspopup=true] menu via fallback', () => {
    const menu = document.createElement('div');
    menu.className = 'J-M';
    menu.setAttribute('aria-haspopup', 'true');
    makeVisible(menu);
    document.body.appendChild(menu);

    const result = findVisibleMenu(FALLBACK_SELECTOR);
    expect(result).toBe(menu);
  });

  test('skips hidden .J-M[aria-haspopup=true] elements (offsetHeight/Width = 0)', () => {
    const hiddenMenu = document.createElement('div');
    hiddenMenu.className = 'J-M';
    hiddenMenu.setAttribute('aria-haspopup', 'true');
    // offsetHeight/offsetWidth default to 0 in jsdom
    document.body.appendChild(hiddenMenu);

    const result = findVisibleMenu(FALLBACK_SELECTOR);
    expect(result).toBeNull();
  });

  test('returns first visible menu when multiple .J-M[aria-haspopup=true] elements exist', () => {
    const hiddenMenu = document.createElement('div');
    hiddenMenu.className = 'J-M';
    hiddenMenu.setAttribute('aria-haspopup', 'true');

    const visibleMenu = document.createElement('div');
    visibleMenu.className = 'J-M';
    visibleMenu.setAttribute('aria-haspopup', 'true');
    makeVisible(visibleMenu);

    document.body.appendChild(hiddenMenu);
    document.body.appendChild(visibleMenu);

    const result = findVisibleMenu(FALLBACK_SELECTOR);
    expect(result).toBe(visibleMenu);
  });

  test('returns null when no .J-M[aria-haspopup=true] elements in DOM', () => {
    const result = findVisibleMenu(FALLBACK_SELECTOR);
    expect(result).toBeNull();
  });

  // ── Fallback 2: div[role=menu], .J-M broad search ──

  test('returns visible div[role=menu] via broad fallback', () => {
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    makeVisible(menu);
    document.body.appendChild(menu);

    const result = findVisibleMenu(BROAD_SELECTOR);
    expect(result).toBe(menu);
  });

  test('returns visible .J-M element via broad fallback selector', () => {
    const menu = document.createElement('div');
    menu.className = 'J-M';
    makeVisible(menu);
    document.body.appendChild(menu);

    const result = findVisibleMenu(BROAD_SELECTOR);
    expect(result).toBe(menu);
  });

  test('skips hidden elements in broad fallback', () => {
    const hiddenRoleMenu = document.createElement('div');
    hiddenRoleMenu.setAttribute('role', 'menu');

    const hiddenJM = document.createElement('div');
    hiddenJM.className = 'J-M';

    document.body.appendChild(hiddenRoleMenu);
    document.body.appendChild(hiddenJM);

    const result = findVisibleMenu(BROAD_SELECTOR);
    expect(result).toBeNull();
  });

  test('returns null when no visible menus found anywhere', () => {
    const unrelated = document.createElement('div');
    unrelated.className = 'some-other-class';
    document.body.appendChild(unrelated);

    expect(findVisibleMenu(FALLBACK_SELECTOR)).toBeNull();
    expect(findVisibleMenu(BROAD_SELECTOR)).toBeNull();
  });
});
