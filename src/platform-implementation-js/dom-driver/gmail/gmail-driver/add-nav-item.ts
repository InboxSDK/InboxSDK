import * as Kefir from 'kefir';
import GmailElementGetter from '../gmail-element-getter';
import GmailNavItemView, {
  type NavItemDescriptor,
} from '../views/gmail-nav-item-view';
import Logger from '../../../lib/logger';
import waitFor from '../../../lib/wait-for';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';
import querySelector from '../../../lib/dom/querySelectorOrFail';

import GmailDriver from '../gmail-driver';
import once from 'lodash/once';
import {
  getPanelNavItemContainerElement,
  getPanelSectionNavItemContainerElement,
} from './nav-item-section';

async function attachGmailNavItemView(
  gmailNavItemView: GmailNavItemView,
  injectionContainer?: HTMLElement,
) {
  const attacher = _attachNavItemView(gmailNavItemView, injectionContainer);

  // The attacher may be invoked again on each orderChanged event, so every
  // invocation needs its rejections handled, not just the first.
  const attach = async () => {
    try {
      await attacher();
    } catch (err) {
      Logger.error(err);
    }
  };

  await attach();

  gmailNavItemView
    .getEventStream()
    .filter((event) => event.eventName === 'orderChanged')
    .onValue(attach);
}

export default async function addNavItem(
  driver: GmailDriver,
  orderGroup: string,
  navItemDescriptor: Kefir.Observable<NavItemDescriptor, unknown>,
  navMenuInjectionContainer?: HTMLElement,
): Promise<GmailNavItemView> {
  await waitForMenuReady();

  const gmailNavItemView = new GmailNavItemView(driver, orderGroup, 1);
  gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

  if (!GmailElementGetter.isStandalone()) {
    attachGmailNavItemView(gmailNavItemView, navMenuInjectionContainer);
  }

  return gmailNavItemView;
}

export async function addNavItemToPanel(
  driver: GmailDriver,
  orderGroup: string,
  navItemDescriptor: Kefir.Observable<NavItemDescriptor, unknown>,
  panelElement: HTMLElement,
): Promise<GmailNavItemView> {
  await waitForMenuReady();

  const gmailNavItemView = new GmailNavItemView(driver, orderGroup, 1);
  gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

  if (!GmailElementGetter.isStandalone()) {
    if (gmailNavItemView.isSection()) {
      const container = getPanelSectionNavItemContainerElement(panelElement);
      attachGmailNavItemView(gmailNavItemView, container);
    } else {
      const container = getPanelNavItemContainerElement(
        panelElement,
        gmailNavItemView.sectionKey,
      );
      attachGmailNavItemView(gmailNavItemView, container);
    }
  }

  return gmailNavItemView;
}

export const waitForMenuReady = once(async (): Promise<void> => {
  const appMenu = await GmailElementGetter.getAppMenuAsync();
  if (!appMenu) {
    await waitForNavMenuReady();
  }
});

const waitForNavMenuReady = once(async (): Promise<void> => {
  if (!GmailElementGetter.isStandalone()) {
    await GmailElementGetter.waitForGmailModeToSettle();
    await waitFor(() =>
      document.querySelector('.aeN[role=navigation], .aeN [role=navigation]'),
    );
    // Wait for contents of navmenu to load (needed to figure out if it's integrated gmail mode)
    await waitFor(() => document.querySelector('.Ls77Lb.aZ6 > .pp'));
  }
});

function _attachNavItemView(
  gmailNavItemView: GmailNavItemView,
  navMenuInjectionContainer?: HTMLElement,
) {
  if (navMenuInjectionContainer) {
    return () => {
      insertElementInOrder(
        navMenuInjectionContainer,
        gmailNavItemView.getElement(),
      );
    };
  }

  if (!GmailElementGetter.shouldAddNavItemsInline()) {
    // If we're in the modern (non-classic-hangouts) leftnav, then put
    // the added nav items in a floating section at the bottom separate
    // from the Mail section.
    return function () {
      const navMenuInjectionContainer =
        GmailElementGetter.getSeparateSectionNavItemMenuInjectionContainer();
      if (!navMenuInjectionContainer) {
        throw new Error('should not happen');
      }

      const nonMailLeftNavSections = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.Xa.wT:not([data-group-order-hint])',
        ),
      ).slice(1);
      nonMailLeftNavSections.forEach((div) => {
        div.dataset.groupOrderHint = 'zz_gmail';
      });

      insertElementInOrder(
        navMenuInjectionContainer,
        gmailNavItemView.getElement(),
      );
    };
  } else {
    // If we're in the old classic-hangouts-compatible leftnav, then
    // inject our added nav items among Gmail's own nav items.
    return async function () {
      const holder = await _getNavItemsHolder();
      // The wait for the holder can outlive the nav item: don't insert the
      // element of a view that was destroyed in the meantime.
      if (gmailNavItemView.isDestroyed()) return;
      insertElementInOrder(holder, gmailNavItemView.getElement());
    };
  }
}

let navItemsHolderCreationPromise: Promise<HTMLElement> | null = null;

function _getNavItemsHolder(): HTMLElement | Promise<HTMLElement> {
  const holder = document.querySelector('.inboxsdk__navMenu');
  if (holder) {
    return querySelector(holder, '.TK');
  }
  // Share one creation between concurrent callers: waitFor always defers at
  // least one macrotask, so two callers could otherwise both see no holder in
  // the DOM and insert duplicate holders. The cache is cleared once creation
  // settles: on success the holder is found in the DOM above, and on failure
  // a later call gets to retry.
  if (!navItemsHolderCreationPromise) {
    navItemsHolderCreationPromise = _createNavItemsHolder().finally(() => {
      navItemsHolderCreationPromise = null;
    });
  }
  return navItemsHolderCreationPromise;
}

async function _createNavItemsHolder(): Promise<HTMLElement> {
  const holder = document.createElement('div');
  holder.setAttribute('class', 'LrBjie inboxsdk__navMenu');
  holder.innerHTML = '<div class="TK"></div>';

  const navMenuInjectionContainer = await waitFor(() =>
    GmailElementGetter.getSameSectionNavItemMenuInjectionContainer(),
  );

  navMenuInjectionContainer.insertBefore(
    holder,
    navMenuInjectionContainer.children[2],
  );

  makeMutationObserverStream(holder, {
    attributes: true,
    attributeFilter: ['class'],
  }).onValue(function () {
    if (holder.classList.contains('TA')) {
      holder.classList.remove('TA');
    }
  });

  return querySelector(holder, '.TK');
}
