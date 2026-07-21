import waitFor from '../../../lib/wait-for';
import fakeWindowResize from '../../../lib/fake-window-resize';
import type GmailDriver from '../gmail-driver';

/**
 * Gmail keeps compose/SDK moles clear of the right side panel by widening a flex
 * spacer at `.dw > .jAmAWb`.
 *
 * Gmail drives that spacer for its OWN companion panels (Calendar, Keep, Tasks,
 * Contacts) but not for InboxSDK content panels, which sit in the same column
 * (`.WN9Ejb`). So whenever the column resizes (or the first mole appears) we
 * match the spacer using Gmail's own formula — companion content width + rail
 * inset
 */

/** This includes the panel and the tab rail. */
const RIGHT_COLUMN_SELECTOR = 'div.aUx';

/** Google companions and SDK panels both render their body here. */
const COMPANION_PANEL_SELECTOR = '.WN9Ejb';

const MOLE_SPACER_SELECTOR = 'div.dw > .jAmAWb';

/**
 * Dispatched by the mole driver whenever a mole is added. Creating a mole
 * doesn't resize the right column, so our `.aUx` observer wouldn't otherwise fire.
 */
export const MOLE_SPACER_REFRESH_EVENT = 'inboxsdk__refreshMoleSpacer';

/** Prevents multiple InboxSDK instances from each installing the observer. */
const INSTALLED_ATTR = 'data-inboxsdk-mole-spacer-sync';

/**
 * The rail-inset width Gmail keeps on the spacer when only the icon rail is
 * showing. We hardcode it because there are cases where we
 * wouldn't be able to grab it from the DOM.
 */
const RAIL_INSET_WIDTH = 66;

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

  const companion = rightColumn.querySelector<HTMLElement>(
    COMPANION_PANEL_SELECTOR,
  );
  // `.WN9Ejb` stays in the DOM when collapsed (`display: none`); only count it
  // when a companion/SDK panel is actually showing.
  const companionWidth =
    companion && getComputedStyle(companion).display !== 'none'
      ? companion.getBoundingClientRect().width
      : 0;

  // Match Gmail: content width + rail inset.
  // When no panel is open, companionWidth is 0 and we restore the rail inset
  const targetWidth =
    companionWidth > 0 ? companionWidth + RAIL_INSET_WIDTH : RAIL_INSET_WIDTH;

  const target = `${targetWidth}px`;
  if (spacer.style.width !== target) {
    spacer.style.width = target;
    refreshComposeToolbars();
  }
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
