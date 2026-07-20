import waitFor from '../../../lib/wait-for';
import fakeWindowResize from '../../../lib/fake-window-resize';
import type GmailDriver from '../gmail-driver';

/**
 * Gmail keeps compose/SDK moles clear of the right side panel by widening a flex
 * spacer at `.dw > .jAmAWb`.
 *
 * Gmail drives that spacer for its OWN companion panels (Calendar, Keep, Tasks,
 * Contacts) but not for anything else that lives in the same right column
 *
 * We mirror the *occupied width* of the right column onto the spacer: whenever
 * the column is showing more than its ~56px icon rail, some panel is open (whoever owns it)
 * and the spacer is set to match; otherwise we leave the spacer alone so Gmail
 * keeps managing its own companions.
 */

const RIGHT_COLUMN_SELECTOR = 'div.aUx';
const MOLE_SPACER_SELECTOR = 'div.dw > .jAmAWb';

/**
 * Dispatched by the mole driver whenever a mole is added. Creating a mole
 * doesn't resize the right column, so our `.aUx` observers wouldn't otherwise fire
 */
export const MOLE_SPACER_REFRESH_EVENT = 'inboxsdk__refreshMoleSpacer';

/** Marks a spacer whose width was set by us, so we only ever clear our own. */
const MANAGED_ATTR = 'data-inboxsdk-mole-spacer-managed';

/** Stores the spacer's original inline width so we can restore it exactly. */
const ORIGINAL_WIDTH_ATTR = 'data-inboxsdk-mole-spacer-original-width';

/** Prevents multiple InboxSDK instances from each installing the observer. */
const INSTALLED_ATTR = 'data-inboxsdk-mole-spacer-sync';

/**
 * The right column shows only a ~56px icon rail when no panel is open. Anything
 * wider than this means a panel is present. The headroom above 56px keeps
 * icon-rail-only states (including the rail collapsing, which Gmail also ignores)
 * from being mistaken for an open panel.
 */
const ICON_RAIL_MAX_WIDTH = 80;

export default function syncMoleSpacerWithRightColumn(driver: GmailDriver) {
  const ResizeObserver = global.ResizeObserver;
  if (!ResizeObserver) return;

  const root = document.documentElement;
  if (root.hasAttribute(INSTALLED_ATTR)) return;
  root.setAttribute(INSTALLED_ATTR, 'true');

  waitFor(() => document.querySelector<HTMLElement>(RIGHT_COLUMN_SELECTOR))
    .then((rightColumn) => {
      let scheduled = false;
      // Coalesce bursts of mutations into a single read+write per frame so we
      // don't thrash layout with getBoundingClientRect on every notification.
      const update = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          try {
            updateSpacer(rightColumn);
          } catch (err) {
            driver.getLogger().error(err as Error);
          }
        });
      };

      // Width changes when a panel opens/closes/resizes.
      new ResizeObserver(update).observe(rightColumn);
      // A panel can also toggle via `display`/`class` changes on the column
      // itself without a resize notification, so watch those too.
      new MutationObserver(update).observe(rightColumn, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: true,
      });
      // A mole appearing (which also creates the spacer on the very first one)
      // doesn't touch the right column, so the mole driver signals us directly.
      document.addEventListener(MOLE_SPACER_REFRESH_EVENT, update);

      update();
    })
    .catch(() => {
      // No right column on this page (e.g. a Gmail surface without the side
      // panel). Nothing to keep the moles clear of.
    });
}

function updateSpacer(rightColumn: HTMLElement) {
  // `.dw` has two `.jAmAWb` flex spacers: the left one (index 0) and the right
  // one (last).
  const spacers = document.querySelectorAll<HTMLElement>(MOLE_SPACER_SELECTOR);
  const spacer = spacers[spacers.length - 1];
  // The spacer is part of the mole container, which Gmail loads lazily once a
  // compose/thread view has been used. Until it exists there is nothing to size.
  if (!spacer) return;

  const occupiedWidth = rightColumn.getBoundingClientRect().width;
  const panelOpen = occupiedWidth > ICON_RAIL_MAX_WIDTH;
  const managed = spacer.hasAttribute(MANAGED_ATTR);

  if (managed) {
    if (panelOpen) {
      // Keep our spacer matched to the occupied width (panel opened/resized).
      const targetWidth = `${occupiedWidth}px`;
      if (spacer.style.width !== targetWidth) {
        spacer.style.width = targetWidth;
        refreshComposeToolbars();
      }
    } else {
      // Restore what was there before we took over
      // and hand management back to Gmail.
      spacer.style.width = spacer.getAttribute(ORIGINAL_WIDTH_ATTR) ?? '';
      spacer.removeAttribute(ORIGINAL_WIDTH_ATTR);
      spacer.removeAttribute(MANAGED_ATTR);
      refreshComposeToolbars();
    }
    return;
  }

  // Only act when a panel is open but Gmail hasn't already widened the
  // spacer for it. When Gmail HAS widened it (its own companion — Calendar, Keep,
  // etc.), the spacer is already wider than the rail, so we leave it entirely
  // alone and let Gmail run the whole open/close lifecycle.
  if (!panelOpen) return;
  if (spacer.getBoundingClientRect().width > ICON_RAIL_MAX_WIDTH) return;

  // A panel Gmail isn't accounting for. Take the spacer over,
  // remembering the original width so we can restore it.
  spacer.setAttribute(ORIGINAL_WIDTH_ATTR, spacer.style.width);
  spacer.setAttribute(MANAGED_ATTR, 'true');
  spacer.style.width = `${occupiedWidth}px`;
  refreshComposeToolbars();
}

/**
 * Widening the spacer moves the mole (`.AD`) but Gmail doesn't refresh the
 * `position: fixed; left` it pins on the compose bottom bar (`.aDj.ahe`), so the
 * toolbar is left behind at its old coordinates. A window resize makes Gmail
 * re-lay-out the compose toolbars back under the mole.
 */
function refreshComposeToolbars() {
  fakeWindowResize();
}
