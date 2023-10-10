import once from 'lodash/once';
import * as Kefir from 'kefir';
import makeElementChildStream, {
  ElementWithLifetime,
} from '../../lib/dom/make-element-child-stream';
import querySelector from '../../lib/dom/querySelectorOrFail';
import waitForGmailModeToSettle from './gmail-element-getter/wait-for-gmail-mode-to-settle';

import getMainContentElementChangedStream from './gmail-element-getter/get-main-content-element-changed-stream';
import isIntegratedViewGmail from './gmail-driver/isIntegratedViewGmail';
import Logger from '../../lib/logger';
import waitFor from '../../lib/wait-for';

/**
 * The selector for the new app menu https://support.google.com/mail/answer/11555490 -- FEB 2023
 */
const APP_MENU = '.aeN.WR.a6o.anZ.nH.oy8Mbf[role=navigation]';
/**
 * If the APP_MENU selector is not found, NAV_MENU _might_ be present.
 */
const NAV_MENU = '.aeN.WR.nH.oy8Mbf[role=navigation]';

// TODO Figure out if these functions can and should be able to return null
const GmailElementGetter = {
  getActiveMoreMenu(): HTMLElement | null {
    const elements = document.querySelectorAll<HTMLElement>(
      '.J-M.aX0.aYO.jQjAxd',
    );

    for (let ii = 0; ii < elements.length; ii++) {
      if (elements[ii].style.display !== 'none') {
        return elements[ii];
      }
    }

    return null;
  },

  getAddonSidebarContainerElement(): HTMLElement | null {
    // only for Gmailv1 + Gmailv2-before-2018-07-30?
    return document.querySelector('.no > .nn.bnl');
  },

  getCompanionSidebarContentContainerElement(): HTMLElement | null {
    return document.querySelector('.brC-brG');
  },

  // <div class="brC-aT5-aOt-Jw" role="navigation" aria-label="Side panel">
  getCompanionSidebarIconContainerElement(): HTMLElement | null {
    return document.querySelector('.brC-aT5-aOt-Jw');
  },

  getComposeButton(): HTMLElement | null {
    if (isIntegratedViewGmail()) {
      return document.querySelector('.aIH .aic div[role=button].L3');
    }
    return document.querySelector('[gh=cm]');
  },

  getComposeWindowContainer(): HTMLElement | null {
    return document.querySelector('.dw .nH > .nH > .no');
  },

  getContentSectionElement(): HTMLElement | undefined | null {
    // New method for finding the content section element that also supports
    // Gmail integrated view. Use it if we're in Gmail integrated view.
    // Otherwise, use the old method, but log a warning if the old method
    // finds something different than the old method, so that way we can
    // figure out if it's okay to swap over.
    const el = document.querySelector<HTMLElement>('div.nH.bkK > .nH');

    if (isIntegratedViewGmail()) {
      return el;
    } else {
      const leftNavContainer = GmailElementGetter.getLeftNavContainerElement();
      const oldMethodEl = leftNavContainer
        ? (leftNavContainer.nextElementSibling!.children[0] as HTMLElement)
        : null;
      if (el !== oldMethodEl) {
        Logger.error(
          new Error(
            'getContentSectionElement old and new method inconsistency',
          ),
          {
            elClassName: el?.className,
            oldMethodClassName: oldMethodEl?.className,
          },
        );
      }
      return oldMethodEl;
    }
  },

  getFullscreenComposeWindowContainer(): HTMLElement | null {
    return document.querySelector('.aSs .aSt');
  },

  getFullscreenComposeWindowContainerStream(): Kefir.Observable<
    ElementWithLifetime,
    never
  > {
    if (!document.body) throw new Error();
    return (
      makeElementChildStream(document.body)
        .filter(({ el }) => el.classList.contains('aSs'))
        .flatMap(({ el, removalStream }) =>
          makeElementChildStream(el).takeUntilBy(removalStream),
        )
        .filter(({ el }) => el.classList.contains('aSt'))
        // Assume that only one element will come through and will never be removed from the page.
        .take(1)
        .map(({ el }) => ({ el, removalStream: Kefir.never() }))
        .toProperty()
    );
  },

  getGtalkButtons(): HTMLElement | null {
    return document.querySelector('.aeN .aj5.J-KU-Jg');
  },

  getLeftNavContainerElement(): HTMLElement | null {
    if (this.getAppMenu()) {
      return this.getAppMenuContainer()?.querySelector('.aqn.aIH') ?? null;
    }
    if (isIntegratedViewGmail()) {
      return document.querySelector('div[role=navigation] + div.aqn');
    }
    return document.querySelector('.aeN');
  },

  getLeftNavHeightElement(): HTMLElement | null {
    return document.querySelector('.aeN');
  },

  getMainContentBodyContainerElement(): HTMLElement | null {
    return document.querySelector('.no > .nn.bkK');
  },

  getMainContentContainer(): HTMLElement | null {
    // This method used to just look for the div[role=main] element and then
    // return its parent, but it turns out the Contacts page does not set
    // role=main.
    return document.querySelector('div.aeF > div.nH');
  },

  getMainContentElementChangedStream: once(function (
    this: any,
  ): Kefir.Observable<HTMLElement, never> {
    return getMainContentElementChangedStream(this);
  }),

  getMoleParent(): HTMLElement | null {
    return document.body.querySelector('.dw .nH > .nH > .no');
  },

  /**
   * This method checks whether we should use the old InboxSDK style of adding nav items
   * inline among Gmail's nav items (as opposed to the newer style where we put our nav items
   * in their own sections at the bottom of the leftnav).
   */
  shouldAddNavItemsInline(): boolean {
    if (isIntegratedViewGmail()) {
      return true;
    }

    const leftNavElement = document.querySelector(
      '.aeN[role=navigation], .aeN [role=navigation]',
    );
    if (!leftNavElement) {
      throw new Error('shouldAddNavItemsInline failed to find leftNavElement');
    }

    // leftNavElement classnames depending on gmail chat & meet settings:

    // Collapsed gets .bhZ class added
    //  div.aeN.WR.nH.oy8Mbf.nn (chat off, google meet off)
    //  div.aeN.WR.BaIAZe.anZ.nH.oy8Mbf.nn (chat off, google meet on)
    //  div.aeN.WR.anZ.nH.oy8Mbf.nn (google chat on left, google meet on/off)
    //  div.aeN.WR.ahu.nH.oy8Mbf.nn (google chat on right, google meet on/off)

    if (leftNavElement.classList.contains('aZ6')) {
      return true;
    } else {
      return false;
    }
  },

  getAppMenuAsync: once(async () => {
    if (!GmailElementGetter.isStandalone()) {
      await GmailElementGetter.waitForGmailModeToSettle();

      try {
        const element = await waitFor(() =>
          document.querySelector<HTMLElement>(`${APP_MENU}, ${NAV_MENU}`),
        );

        if (!document.querySelector(APP_MENU)) {
          return;
        }

        return element;
      } catch (e) {
        Logger.error(e);
      }
    }
  }),

  getAppBurgerMenu() {
    return document.querySelector<HTMLElement>(
      'header[role="banner"] > div > div > div[aria-expanded]',
    );
  },

  isAppBurgerMenuOpen() {
    return (
      this.getAppBurgerMenu()?.getAttribute('aria-expanded') === 'true' ?? false
    );
  },

  getAppMenuContainer() {
    return document.querySelector<HTMLElement>('.aqk.aql.bkL');
  },

  getAppMenu() {
    return document.querySelector<HTMLElement>(APP_MENU);
  },

  getAppHeader() {
    return document.querySelector<HTMLElement>('.oy8Mbf.qp');
  },

  getSeparateSectionNavItemMenuInjectionContainer(): HTMLElement | null {
    return document.querySelector('.aeN');
  },

  getSameSectionNavItemMenuInjectionContainer(): HTMLElement | null {
    if (isIntegratedViewGmail()) {
      return document.querySelector('.yJ .wT > .n3');
    } else {
      return document.querySelector('.aeN .n3');
    }
  },

  getRowListElements(): HTMLElement[] | null {
    const rowListElements = document.querySelectorAll<HTMLElement>('[gh=tl]');
    if (rowListElements.length === 0) {
      return null;
    }
    return Array.from(rowListElements);
  },

  getScrollContainer(): HTMLElement | null {
    return document.querySelector('div.Tm.aeJ');
  },

  getSearchInput(): HTMLInputElement | null {
    return document.querySelector(
      'form[role=search] input',
    ) as HTMLInputElement | null;
  },

  getSearchSuggestionsBoxParent(): HTMLElement | null {
    return document.querySelector('table.gstl_50 > tbody > tr > td.gssb_e');
  },

  getSidebarContainerElement(): HTMLElement | null {
    return document.querySelector('[role=main] table.Bs > tr .y3');
  },

  getThreadBackButton(): HTMLElement | null {
    let toolbarElement;
    try {
      toolbarElement = GmailElementGetter.getToolbarElement();
    } catch (err) {
      return null;
    }

    return toolbarElement.querySelector('.lS');
  },

  getThreadContainerElement(): HTMLElement | null {
    return document.querySelector('[role=main] .g.id table.Bs > tr');
  },

  getToolbarElement(): HTMLElement {
    return querySelector(document, '[gh=tm]');
  },

  getTopAccountContainer(): HTMLElement | null {
    return document.querySelector(
      'header[role="banner"] > div:nth-child(2) > div:nth-child(2)',
    );
  },

  isGplusEnabled(): boolean {
    const topAccountContainer = GmailElementGetter.getTopAccountContainer();
    if (!topAccountContainer) {
      return false;
    }

    return (
      topAccountContainer.querySelectorAll(
        'a[href*="https://plus"][href*="upgrade"]',
      ).length === 0
    );
  },

  isDarkTheme(): boolean {
    return document.body.classList.contains('inboxsdk__gmail_dark_theme');
  },

  isPreviewPane(): boolean {
    return !!document.querySelector('.aia');
  },

  isStandalone(): boolean {
    return this.isStandaloneComposeWindow() || this.isStandaloneThreadWindow();
  },

  isStandaloneComposeWindow(): boolean {
    return (
      document.body.classList.contains('xE') &&
      document.body.classList.contains('xp')
    );
  },

  isStandaloneThreadWindow(): boolean {
    return (
      document.body.classList.contains('aAU') &&
      document.body.classList.contains('xE') &&
      document.body.classList.contains('Su')
    );
  },

  StandaloneCompose: {
    getComposeWindowContainer(): HTMLElement | null {
      return document.querySelector('[role=main]');
    },
  },

  waitForGmailModeToSettle(): Promise<void> {
    return waitForGmailModeToSettle().toPromise();
  },
};

export default GmailElementGetter;
