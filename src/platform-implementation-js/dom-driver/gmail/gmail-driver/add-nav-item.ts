import * as Kefir from 'kefir';
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

function attachGmailNavItemView(
  driver: GmailDriver,
  gmailNavItemView: GmailNavItemView,
  injectionContainer?: HTMLElement,
) {
  try {
    const attacher = _attachNavItemView(
      driver,
      gmailNavItemView,
      injectionContainer,
    );

    attacher();

    gmailNavItemView
      .getEventStream()
      .filter((event) => event.eventName === 'orderChanged')
      .onValue(attacher);
  } catch (err) {
    Logger.error(err);
  }
}

export default async function addNavItem(
  driver: GmailDriver,
  orderGroup: string,
  navItemDescriptor: Kefir.Observable<NavItemDescriptor, unknown>,
  navMenuInjectionContainer?: HTMLElement,
): Promise<GmailNavItemView> {
  await waitForMenuReady(driver);

  const gmailNavItemView = new GmailNavItemView(driver, orderGroup, 1);
  gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

  if (!driver.elementGetter.isStandalone()) {
    attachGmailNavItemView(driver, gmailNavItemView, navMenuInjectionContainer);
  }

  return gmailNavItemView;
}

export async function addNavItemToPanel(
  driver: GmailDriver,
  orderGroup: string,
  navItemDescriptor: Kefir.Observable<NavItemDescriptor, unknown>,
  panelElement: HTMLElement,
): Promise<GmailNavItemView> {
  await waitForMenuReady(driver);

  const gmailNavItemView = new GmailNavItemView(driver, orderGroup, 1);
  gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

  if (!driver.elementGetter.isStandalone()) {
    if (gmailNavItemView.isSection()) {
      const container = getPanelSectionNavItemContainerElement(panelElement);
      attachGmailNavItemView(driver, gmailNavItemView, container);
    } else {
      const container = getPanelNavItemContainerElement(
        panelElement,
        gmailNavItemView.sectionKey,
      );
      attachGmailNavItemView(driver, gmailNavItemView, container);
    }
  }

  return gmailNavItemView;
}

export const waitForMenuReady = once(
  async (driver: GmailDriver): Promise<void> => {
    const appMenu = await driver.elementGetter.getAppMenuAsync();
    if (!appMenu) {
      await waitForNavMenuReady(driver);
    }
  },
);

const waitForNavMenuReady = once(async (driver: GmailDriver): Promise<void> => {
  if (!driver.elementGetter.isStandalone()) {
    await driver.elementGetter.waitForGmailModeToSettle();
    await waitFor(() =>
      document.querySelector('.aeN[role=navigation], .aeN [role=navigation]'),
    );
    // Wait for contents of navmenu to load (needed to figure out if it's integrated gmail mode)
    await waitFor(() => document.querySelector('.Ls77Lb.aZ6 > .pp'));
  }
});

function _attachNavItemView(
  driver: GmailDriver,
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

  if (!driver.elementGetter.shouldAddNavItemsInline()) {
    // If we're in the modern (non-classic-hangouts) leftnav, then put
    // the added nav items in a floating section at the bottom separate
    // from the Mail section.
    return function () {
      const navMenuInjectionContainer =
        driver.elementGetter.getSeparateSectionNavItemMenuInjectionContainer();
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
    return function () {
      insertElementInOrder(
        _getNavItemsHolder(driver),
        gmailNavItemView.getElement(),
      );
    };
  }
}

function _getNavItemsHolder(driver: GmailDriver): HTMLElement {
  const holder = document.querySelector('.inboxsdk__navMenu');
  if (!holder) {
    return _createNavItemsHolder(driver);
  } else {
    return querySelector(holder, '.TK');
  }
}

function _createNavItemsHolder(driver: GmailDriver): HTMLElement {
  const holder = document.createElement('div');
  holder.setAttribute('class', 'LrBjie inboxsdk__navMenu');
  holder.innerHTML = '<div class="TK"></div>';

  const navMenuInjectionContainer =
    driver.elementGetter.getSameSectionNavItemMenuInjectionContainer();
  if (!navMenuInjectionContainer) throw new Error('should not happen');
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
