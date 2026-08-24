import autoHtml from 'auto-html';
import cx from 'classnames';
import isEmpty from 'lodash/isEmpty';
import type { MessageViewToolbarButtonDescriptor } from '../../../../views/conversations/message-view';

/**
 * Attributes that wire an element to Gmail's own event handling and logging.
 * A cloned item must not inherit them or Gmail acts on our menu item.
 */
const BEHAVIOR_ATTRIBUTES = [
  'id',
  'jsaction',
  'jscontroller',
  'jslog',
  'jsname',
  'data-action-type',
  'soy-skip',
  'ssk',
];

/**
 * Scopes the SDK stylesheet's rules for injected items to the clone, including
 * the hover painting Gmail drives from the jsaction we drop.
 */
const ITEM_CLASS = 'inboxsdk__message_more_item';

/**
 * Gmail's sprite base class, shared by the legacy menu and the newer one.
 */
const ICON_BASE_CLASS = 'f4';

/** Carries the SDK stylesheet's icon box, and the consumer's own icon rules. */
const ICON_CLASS = 'inboxsdk__message_more_icon';

/**
 * Legacy menu icon class. Only the hand-built item wears it — on a clone it
 * also drags in Gmail's background shorthand, which blanks the consumer image.
 */
const LEGACY_ICON_CLASS = 'J-N-JX';

/**
 * Creates a menu item for the 'more' menu on an individual message view.
 */
export function createMoreMenuItem(
  openMoreMenu: HTMLElement,
  options: MessageViewToolbarButtonDescriptor,
): HTMLElement {
  const template = openMoreMenu.querySelector<HTMLElement>('li[role=menuitem]');
  const itemEl = template
    ? createItemFromTemplate(template, options)
    : createLegacyItem(options);

  // Gmail's roving tabindex is driven by the jscontroller we strip, so the
  // clone would otherwise be unreachable by keyboard.
  itemEl.tabIndex = 0;

  return itemEl;
}

/**
 * Creates a divider for the 'more' menu on an individual message view.
 */
export function createMoreMenuDivider(openMoreMenu: HTMLElement): HTMLElement {
  const template = openMoreMenu.querySelector<HTMLElement>(
    'li[role=separator], hr',
  );

  if (!template) {
    const dividerEl = document.createElement('div');
    dividerEl.className = 'J-Kh';
    return dividerEl;
  }

  const dividerEl = template.cloneNode(true) as HTMLElement;
  stripBehaviorAttributes(dividerEl);
  return dividerEl;
}

/**
 * Copies the layout from a live menu item rather than hardcoding it: the
 * classes are hashed, so they churn whenever Gmail rebuilds the menu.
 */
function createItemFromTemplate(
  template: HTMLElement,
  options: MessageViewToolbarButtonDescriptor,
): HTMLElement {
  const itemEl = template.cloneNode(true) as HTMLElement;
  stripBehaviorAttributes(itemEl);
  itemEl.classList.add(ITEM_CLASS);

  const labelEl = findLabelElement(itemEl);
  if (labelEl) {
    labelEl.textContent = options.title;
  }

  applyIcon(findIconElement(itemEl), options);
  return itemEl;
}

/**
 * Creates a menu item for the 'more' menu on an individual message view, using
 * the legacy hand-built layout rather than cloning a live menu item.
 */
function createLegacyItem(
  options: MessageViewToolbarButtonDescriptor,
): HTMLElement {
  // Gmail's legacy menu drives its own hover from JS, so the item has to
  // toggle the hover class itself.
  const hoverClass = 'J-N-JT';

  const itemEl = document.createElement('div');
  itemEl.className = 'J-N';
  itemEl.setAttribute('role', 'menuitem');
  itemEl.innerHTML = autoHtml`<div class="J-N-Jz">${options.title}</div>`;
  itemEl.addEventListener('mouseenter', () => itemEl.classList.add(hoverClass));
  itemEl.addEventListener('mouseleave', () =>
    itemEl.classList.remove(hoverClass),
  );

  if (options.iconUrl || options.iconClass) {
    const iconEl = document.createElement('img');
    iconEl.className = cx(
      ICON_BASE_CLASS,
      LEGACY_ICON_CLASS,
      ICON_CLASS,
      options.iconClass,
    );
    iconEl.src = options.iconUrl || 'images/cleardot.gif';
    itemEl.firstElementChild?.appendChild(iconEl);
  }

  return itemEl;
}

/**
 * Removes Gmail's own wiring from a cloned menu item, so it doesn't act on our
 * click or hover.
 */
function stripBehaviorAttributes(root: HTMLElement) {
  for (const el of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    for (const attribute of BEHAVIOR_ATTRIBUTES) {
      el.removeAttribute(attribute);
    }
  }
}

function trimmedText(el: Element | null): string {
  return (el?.textContent ?? '').trim();
}

/**
 * The longest text-bearing leaf is the label; the item's other spans are
 * empty slots for the ripple, icon and trailing affordances.
 */
function findLabelElement(itemEl: HTMLElement): HTMLElement | null {
  let labelEl: HTMLElement | null = null;

  for (const el of itemEl.querySelectorAll<HTMLElement>('*')) {
    if (el.children.length) continue;
    const text = trimmedText(el);
    if (!isEmpty(text) && text.length > trimmedText(labelEl).length) {
      labelEl = el;
    }
  }

  return labelEl;
}

function findIconElement(itemEl: HTMLElement): HTMLElement | null {
  return itemEl.querySelector<HTMLElement>(`.${ICON_BASE_CLASS}`);
}

function applyIcon(
  iconEl: HTMLElement | null,
  options: MessageViewToolbarButtonDescriptor,
) {
  if (!iconEl) return;

  // The clone still holds Gmail's own glyph, which would paint under ours.
  iconEl.replaceChildren();
  iconEl.className = cx(ICON_BASE_CLASS, ICON_CLASS, options.iconClass);
  iconEl.style.backgroundImage = options.iconUrl
    ? `url(${JSON.stringify(options.iconUrl)})`
    : '';
}
