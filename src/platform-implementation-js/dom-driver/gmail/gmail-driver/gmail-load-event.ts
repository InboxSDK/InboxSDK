import type GmailDriver from '../gmail-driver';
import isIntegratedViewGmail, {
  isCollapsiblePanelHidden,
  isGoogleChatEnabled,
} from './isIntegratedViewGmail';
import { waitForMenuReady } from './add-nav-item';
import { checkForDarkThemeSafe } from './track-gmail-styles';

export default async function gmailLoadEvent(driver: GmailDriver) {
  const pageCommunicator = driver.getPageCommunicator();

  const isConversationViewDisabled =
    await pageCommunicator.isConversationViewDisabled();
  await waitForMenuReady();
  const isUsingDarkTheme = await checkForDarkThemeSafe();

  const timing = performance?.timing;

  driver.getLogger().eventSite('gmailSettings', {
    isGmailIntegratedView: isIntegratedViewGmail(),
    /**
     * This is the panel on the left side of the screen. If the top left burger of Gmail is collapsed, then this is true.
     */
    isCollapsiblePanelHidden: isCollapsiblePanelHidden(),
    isGoogleChatEnabled: isGoogleChatEnabled(),
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
