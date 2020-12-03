import once from 'lodash/once';
import * as Kefir from 'kefir';
import makeElementChildStream, {
  ElementWithLifetime
} from '../../lib/dom/make-element-child-stream';
import querySelector from '../../lib/dom/querySelectorOrFail';
import waitForGmailModeToSettle from './gmail-element-getter/wait-for-gmail-mode-to-settle';

import getMainContentElementChangedStream from './gmail-element-getter/get-main-content-element-changed-stream';

// TODO Figure out if these functions can and should be able to return null
const GmailElementGetter = {
  getActiveMoreMenu(): HTMLElement | null {
    const elements = document.querySelectorAll<HTMLElement>(
      '.J-M.aX0.aYO.jQjAxd'
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
    return document.querySelector('[gh=cm]');
  },

  getComposeWindowContainer(): HTMLElement | null {
    return document.querySelector('.dw .nH > .nH > .no');
  },

  getContentSectionElement(): HTMLElement | undefined {
    const leftNavContainer = GmailElementGetter.getLeftNavContainerElement();
    if (leftNavContainer) {
      return leftNavContainer.nextElementSibling!.children[0] as HTMLElement;
    } else {
      return undefined;
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
          makeElementChildStream(el).takeUntilBy(removalStream)
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

  getMainContentElementChangedStream: once(function(
    this: any
  ): Kefir.Observable<HTMLElement, never> {
    return getMainContentElementChangedStream(this);
  }),

  getMoleParent(): HTMLElement | null {
    return document.body.querySelector('.dw .nH > .nH > .no');
  },

  getNavItemMenuInjectionContainer(): HTMLElement | null {
    return this.isNewLeftNav()
      ? document.querySelector('.aeN')
      : document.querySelector('.aeN .n3');
  },

  getRowListElements(): HTMLElement[] {
    return Array.from(document.querySelectorAll('[gh=tl]'));
  },

  getScrollContainer(): HTMLElement | null {
    return document.querySelector('div.Tm.aeJ');
  },

  getSearchInput(): HTMLInputElement | null {
    return document.querySelector(
      'form[role=search] input'
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
      'header[role="banner"] > div:nth-child(2) > div:nth-child(2)'
    );
  },

  isGplusEnabled(): boolean {
    const topAccountContainer = GmailElementGetter.getTopAccountContainer();
    if (!topAccountContainer) {
      return false;
    }

    return (
      topAccountContainer.querySelectorAll(
        'a[href*="https://plus"][href*="upgrade"]'
      ).length === 0
    );
  },

  isNewLeftNav(): boolean {
    return Boolean(document.querySelector('.WR[role="navigation"]'));
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
    }
  },

  waitForGmailModeToSettle(): Promise<void> {
    return waitForGmailModeToSettle().toPromise();
  }
};

export default GmailElementGetter;
