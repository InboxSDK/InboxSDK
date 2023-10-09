import type GmailDriver from '../gmail-driver';
import isIntegratedViewGmail, {
  isCollapsiblePanelHidden,
  isGoogleChatEnabled,
} from './isIntegratedViewGmail';
import { waitForMenuReady } from './add-nav-item';
import { checkForDarkThemeSafe } from './track-gmail-styles';
import waitFor, { WaitForError } from '../../../lib/wait-for';

async function isSidePanelCollapsed() {
  const sidePanelSelector = '.brC-aT5-aOt-Jw[role=complementary]';

  try {
    await waitFor(() => document.querySelector(sidePanelSelector), 10_000);
    // Wait for the collapse button to appear too. Otherwise, the side panel will initially appear without a display style set for collapsed.
    await waitFor(() => document.querySelector('.aT5-aOt-I[role=button]'));
  } catch (e: unknown) {
    if (e instanceof WaitForError) {
      return null;
    }

    throw e;
  }

  const maybeCollapsedSidePanel = document.querySelector(
    `${sidePanelSelector}[style*="display: none;"]`,
  );

  // If the sidePanel is collapsed, it will have a style attribute with display: none
  return maybeCollapsedSidePanel != null;
}

export default async function gmailLoadEvent(driver: GmailDriver) {
  const pageCommunicator = driver.getPageCommunicator();

  const isConversationViewDisabled =
    await pageCommunicator.isConversationViewDisabled();
  await waitForMenuReady();
  const isUsingDarkTheme = await checkForDarkThemeSafe();
  const sidePanelCollapsed = await isSidePanelCollapsed();

  const timing = performance?.timing;

  driver.logger.eventSite('gmailSettings', {
    isGmailIntegratedView: isIntegratedViewGmail(),
    /**
     * This is the panel on the left side of the screen. If the top left burger of Gmail is collapsed, then this is true.
     */
    isCollapsiblePanelHidden: isCollapsiblePanelHidden(),
    isGoogleChatEnabled: isGoogleChatEnabled(),
    /**
     * This is the sidePanel on the right side of the screen. The collapse button is at the bottom right corner of the screen.
     */
    isSidePanelCollapsed: sidePanelCollapsed,
    isDarkTheme: isUsingDarkTheme,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    language: pageCommunicator.getUserLanguage(),
    isUsingSyncAPI: pageCommunicator.isUsingSyncAPI(),
    previewPane: pageCommunicator.getUserOriginalPreviewPaneMode(),
    isConversationViewDisabled,
    wasAccountSwitcherReadyAtStart:
      driver.getEnvData().wasAccountSwitcherReadyAtStart,
    timings: {
      responseStart: timing?.responseStart,
      responseEnd: timing?.responseEnd,
      domLoading: timing?.domLoading,
      domInteractive: timing?.domInteractive,
      domComplete: timing?.domComplete,
      domContentLoadedEventStart: timing?.domContentLoadedEventStart,
      domContentLoadedEventEnd: timing?.domContentLoadedEventEnd,
      domainLookupEnd: timing?.domainLookupEnd,
      domainLookupStart: timing?.domainLookupStart,
      fetchStart: timing?.fetchStart,
      loadEventStart: timing?.loadEventStart,
      loadEventEnd: timing?.loadEventEnd,
      navigationStart: timing?.navigationStart,
      requestStart: timing?.requestStart,
      ...driver.getTimings(),
    },
  });
}
