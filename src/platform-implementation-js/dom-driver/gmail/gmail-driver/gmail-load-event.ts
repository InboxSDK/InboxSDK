/* @flow */

import type GmailDriver from '../gmail-driver';
import isIntegratedViewGmail from './isIntegratedViewGmail';
import { waitForMenuReady } from './add-nav-item';
import { isDarkTheme } from './track-gmail-styles';

export default async function gmailLoadEvent(driver: GmailDriver) {
  const pageCommunicator = driver.getPageCommunicator();

  const isConversationViewDisabled =
    await pageCommunicator.isConversationViewDisabled();
  await waitForMenuReady();

  driver.getLogger().eventSite('gmailSettings', {
    isGmailIntegratedView: isIntegratedViewGmail(),
    isDarkTheme: isDarkTheme(),
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
      ...{
        responseStart: global.performance?.timing.responseStart,
        responseEnd: global.performance?.timing.responseEnd,
        domLoading: global.performance?.timing.domLoading,
        domInteractive: global.performance?.timing.domInteractive,
        domComplete: global.performance?.timing.domComplete,
        domContentLoadedEventStart:
          global.performance?.timing.domContentLoadedEventStart,
        domContentLoadedEventEnd:
          global.performance?.timing.domContentLoadedEventEnd,
        domainLookupEnd: global.performance?.timing.domainLookupEnd,
        domainLookupStart: global.performance?.timing.domainLookupStart,
        fetchStart: global.performance?.timing.fetchStart,
        loadEventStart: global.performance?.timing.loadEventStart,
        loadEventEnd: global.performance?.timing.loadEventEnd,
        navigationStart: global.performance?.timing.navigationStart,
        requestStart: global.performance?.timing.requestStart,
      },
      ...driver.getTimings(),
    },
  });
}
