/* @flow */

import gmailElementGetter from '../gmail-element-getter';
import type GmailDriver from '../gmail-driver';
import isIntegratedViewGmail from './isIntegratedViewGmail';
import { waitForMenuReady } from './add-nav-item';

export default async function gmailLoadEvent(driver: GmailDriver) {
  const pageCommunicator = driver.getPageCommunicator();

  const isConversationViewDisabled =
    await pageCommunicator.isConversationViewDisabled();
  await waitForMenuReady();

  driver.getLogger().eventSite('gmailSettings', {
    isGmailIntegratedView: isIntegratedViewGmail(),
    screenWidth: window.screen && window.screen.width,
    screenHeight: window.screen && window.screen.height,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    language: pageCommunicator.getUserLanguage(),
    isUsingSyncAPI: pageCommunicator.isUsingSyncAPI(),
    previewPane: pageCommunicator.getUserOriginalPreviewPaneMode(),
    isConversationViewDisabled,
    wasAccountSwitcherReadyAtStart:
      driver.getEnvData().wasAccountSwitcherReadyAtStart,
    timings: Object.assign(
      ({
        responseStart:
          global.performance && global.performance.timing.responseStart,
        responseEnd:
          global.performance && global.performance.timing.responseEnd,
        domLoading: global.performance && global.performance.timing.domLoading,
        domInteractive:
          global.performance && global.performance.timing.domInteractive,
        domComplete:
          global.performance && global.performance.timing.domComplete,
        domContentLoadedEventStart:
          global.performance &&
          global.performance.timing.domContentLoadedEventStart,
        domContentLoadedEventEnd:
          global.performance &&
          global.performance.timing.domContentLoadedEventEnd,
        domainLookupEnd:
          global.performance && global.performance.timing.domainLookupEnd,
        domainLookupStart:
          global.performance && global.performance.timing.domainLookupStart,
        fetchStart: global.performance && global.performance.timing.fetchStart,
        loadEventStart:
          global.performance && global.performance.timing.loadEventStart,
        loadEventEnd:
          global.performance && global.performance.timing.loadEventEnd,
        navigationStart:
          global.performance && global.performance.timing.navigationStart,
        requestStart:
          global.performance && global.performance.timing.requestStart,
      }: any),
      driver.getTimings()
    ),
  });
}
