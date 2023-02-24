import * as Kefir from 'kefir';
import GmailElementGetter from '../gmail-element-getter';
import GmailNavItemView from '../views/gmail-nav-item-view';
import Logger from '../../../lib/logger';
import waitFor from '../../../lib/wait-for';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';
import querySelector from '../../../lib/dom/querySelectorOrFail';

import GmailDriver from '../gmail-driver';
import once from 'lodash/once';

export default async function addNavItem(
  driver: GmailDriver,
  orderGroup: string,
  navItemDescriptor: Kefir.Observable<any, any>
): Promise<GmailNavItemView> {
  await waitForNavMenuReady();

  const gmailNavItemView = new GmailNavItemView(driver, orderGroup, 1);
  gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

  if (!GmailElementGetter.isStandalone()) {
    try {
      const attacher = _attachNavItemView(gmailNavItemView);

      attacher();

      gmailNavItemView
        .getEventStream()
        .filter((event) => event.eventName === 'orderChanged')
        .onValue(attacher);
    } catch (err) {
      Logger.error(err);
    }
  }

  return gmailNavItemView;
}

export const waitForNavMenuReady = once(async (): Promise<void> => {
  if (!GmailElementGetter.isStandalone()) {
    await GmailElementGetter.waitForGmailModeToSettle();
    await waitFor(() =>
      document.querySelector('.aeN[role=navigation], .aeN [role=navigation]')
    );
    // Wait for contents of navmenu to load (needed to figure out if it's integrated gmail mode)
    await waitFor(() => document.querySelector('.Ls77Lb.aZ6 > .pp'));
  }
});

function _attachNavItemView(gmailNavItemView: GmailNavItemView) {
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
          '.Xa.wT:not([data-group-order-hint])'
        )
      ).slice(1);
      nonMailLeftNavSections.forEach((div) => {
        div.dataset.groupOrderHint = 'zz_gmail';
      });

      insertElementInOrder(
        navMenuInjectionContainer,
        gmailNavItemView.getElement()
      );
    };
  } else {
    // If we're in the old classic-hangouts-compatible leftnav, then
    // inject our added nav items among Gmail's own nav items.
    return function () {
      insertElementInOrder(_getNavItemsHolder(), gmailNavItemView.getElement());
    };
  }
}

function _getNavItemsHolder(): HTMLElement {
  const holder = document.querySelector('.inboxsdk__navMenu');
  if (!holder) {
    return _createNavItemsHolder();
  } else {
    return querySelector(holder, '.TK');
  }
}

function _createNavItemsHolder(): HTMLElement {
  const holder = document.createElement('div');
  holder.setAttribute('class', 'LrBjie inboxsdk__navMenu');
  holder.innerHTML = '<div class="TK"></div>';

  const navMenuInjectionContainer =
    GmailElementGetter.getSameSectionNavItemMenuInjectionContainer();
  if (!navMenuInjectionContainer) throw new Error('should not happen');
  navMenuInjectionContainer.insertBefore(
    holder,
    navMenuInjectionContainer.children[2]
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
