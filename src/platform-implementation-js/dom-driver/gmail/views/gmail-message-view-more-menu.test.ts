import { findOpenMoreMenu } from './gmail-message-view';

afterEach(() => {
  document.body.innerHTML = '';
});

// jsdom elements have zero offsetWidth/offsetHeight by default, so anything
// that should count as visible needs explicit dimensions.
function makeVisible(el: HTMLElement) {
  Object.defineProperty(el, 'offsetHeight', { value: 20, configurable: true });
  Object.defineProperty(el, 'offsetWidth', { value: 100, configurable: true });
}

/**
 * Builds a structurally realistic Gmail thread pane: the `.aHU` conversation
 * container holds the message element (a table-based header row with the
 * per-message More button) and, as a sibling of the message, the
 * absolutely-positioned More menu. `withDatedStructure: false` drops the
 * `a98` class from the outer pane so none of the dated selectors in
 * findOpenMoreMenu match, forcing the fallback tiers.
 */
function buildThreadFixture({
  withDatedStructure,
  moreButtonExpanded,
}: {
  withDatedStructure: boolean;
  moreButtonExpanded: boolean;
}) {
  const pane = document.createElement('div');
  pane.className = withDatedStructure ? 'nH a98 iY' : 'nH iY';
  pane.innerHTML =
    '<div class="nH">' +
    '<div class="aHU hx">' +
    '<div class="h7">' +
    '<table cellpadding="0" class="cf"><tbody><tr class="acZ xD"><td class="gH">' +
    `<div class="T-I J-J5-Ji aap L3" role="button" aria-haspopup="true" aria-expanded="${moreButtonExpanded}" tabindex="0"></div>` +
    '</td></tr></tbody></table>' +
    '<div class="ii gt"></div>' +
    '</div>' +
    '</div>' +
    '</div>';
  document.body.appendChild(pane);

  const conversationContainer = pane.querySelector<HTMLElement>('.aHU')!;
  const messageElement = pane.querySelector<HTMLElement>('.h7')!;
  const moreButton = messageElement.querySelector<HTMLElement>(
    'tr.acZ div.T-I.J-J5-Ji.aap.L3[role=button][aria-haspopup]',
  )!;
  // Guard fixture realism: the button must match the selector
  // GmailMessageView#getMoreButton uses.
  expect(moreButton).toBeTruthy();

  return { pane, conversationContainer, messageElement, moreButton };
}

function appendMenu(
  parent: HTMLElement,
  {
    className,
    role,
    visible,
  }: { className: string; role?: string; visible: boolean },
): HTMLElement {
  const menu = document.createElement('div');
  menu.className = className;
  if (role) menu.setAttribute('role', role);
  if (className.includes('J-M')) menu.setAttribute('aria-haspopup', 'true');
  menu.style.left = '100px';
  menu.style.top = '50px';
  if (visible) makeVisible(menu);
  parent.appendChild(menu);
  return menu;
}

describe('findOpenMoreMenu', () => {
  test('dated selector wins even when fallback-matching menus are present', () => {
    const { conversationContainer, messageElement, moreButton } =
      buildThreadFixture({
        withDatedStructure: true,
        moreButtonExpanded: true,
      });
    // Fallback bait earlier in document order than the dated menu: a visible
    // generic dropdown in the same conversation container...
    appendMenu(conversationContainer, { className: 'J-M', visible: true });
    // ...and a visible role=menu element.
    appendMenu(conversationContainer, {
      className: 'aX2',
      role: 'menu',
      visible: true,
    });
    // The menu the dated selectors describe.
    const datedMenu = appendMenu(conversationContainer, {
      className: 'b7 J-M aX2',
      role: 'menu',
      visible: true,
    });

    const result = findOpenMoreMenu(messageElement, moreButton);
    expect(result?.element).toBe(datedMenu);
    expect(result?.usedFallback).toBe(false);
  });

  test('falls back to a visible .J-M menu inside this message’s conversation container when the dated selectors miss', () => {
    const { conversationContainer, messageElement, moreButton } =
      buildThreadFixture({
        withDatedStructure: false,
        moreButtonExpanded: true,
      });
    const hiddenMenu = appendMenu(conversationContainer, {
      className: 'J-M',
      visible: false,
    });
    const openMenu = appendMenu(conversationContainer, {
      className: 'J-M',
      visible: true,
    });

    const result = findOpenMoreMenu(messageElement, moreButton);
    expect(result?.element).toBe(openMenu);
    expect(result?.element).not.toBe(hiddenMenu);
    expect(result?.usedFallback).toBe(true);
    expect(result?.selector).toBe('.J-M[aria-haspopup=true]');
  });

  test('never returns a visible menu outside this message’s conversation container', () => {
    const { messageElement, moreButton } = buildThreadFixture({
      withDatedStructure: false,
      moreButtonExpanded: true,
    });
    // An unrelated open dropdown elsewhere in the document (e.g. a label
    // picker or the thread-toolbar More menu) must not be picked up, even
    // though it is visible and this message's More button is expanded.
    const unrelatedContainer = document.createElement('div');
    document.body.appendChild(unrelatedContainer);
    appendMenu(unrelatedContainer, { className: 'b7 J-M', visible: true });
    appendMenu(unrelatedContainer, {
      className: 'aX2',
      role: 'menu',
      visible: true,
    });

    expect(findOpenMoreMenu(messageElement, moreButton)).toBe(null);
  });

  test('returns null when every in-scope menu is hidden', () => {
    const { conversationContainer, messageElement, moreButton } =
      buildThreadFixture({
        withDatedStructure: false,
        moreButtonExpanded: true,
      });
    appendMenu(conversationContainer, { className: 'J-M', visible: false });
    appendMenu(conversationContainer, {
      className: 'aX2',
      role: 'menu',
      visible: false,
    });

    expect(findOpenMoreMenu(messageElement, moreButton)).toBe(null);
  });

  test('broad div[role=menu] tier applies only while the More button is expanded', () => {
    const expanded = buildThreadFixture({
      withDatedStructure: false,
      moreButtonExpanded: true,
    });
    const roleMenu = appendMenu(expanded.conversationContainer, {
      className: 'aX2',
      role: 'menu',
      visible: true,
    });

    const result = findOpenMoreMenu(
      expanded.messageElement,
      expanded.moreButton,
    );
    expect(result?.element).toBe(roleMenu);
    expect(result?.usedFallback).toBe(true);
    expect(result?.selector).toBe('div[role=menu], .J-M');

    document.body.innerHTML = '';

    const collapsed = buildThreadFixture({
      withDatedStructure: false,
      moreButtonExpanded: false,
    });
    appendMenu(collapsed.conversationContainer, {
      className: 'aX2',
      role: 'menu',
      visible: true,
    });

    expect(
      findOpenMoreMenu(collapsed.messageElement, collapsed.moreButton),
    ).toBe(null);
    // Without a More button at all, the broad tier must not run either.
    expect(findOpenMoreMenu(collapsed.messageElement, null)).toBe(null);
  });

  test('returns null when the message has no .aHU ancestor to scope fallbacks to', () => {
    const orphanMessage = document.createElement('div');
    orphanMessage.className = 'h7';
    document.body.appendChild(orphanMessage);
    const openMenu = appendMenu(document.body, {
      className: 'J-M',
      visible: true,
    });
    expect(openMenu).toBeTruthy();

    expect(findOpenMoreMenu(orphanMessage, null)).toBe(null);
  });
});
