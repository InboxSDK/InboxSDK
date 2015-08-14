/* @flow */
//jshint ignore:start

import gmailElementGetter from '../gmail-element-getter';
import type GmailDriver from '../gmail-driver';

export default function gmailLoadEvent(driver: GmailDriver) {
  var pageCommunicator = driver.getPageCommunicator();

  pageCommunicator.isConversationViewDisabled().then(isConversationViewDisabled => {
    driver.getLogger().eventSite('gmailSettings', {
      screenWidth: window.screen && window.screen.width,
      screenHeight: window.screen && window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      language: pageCommunicator.getUserLanguage(),
      previewPane: pageCommunicator.getUserOriginalPreviewPaneMode(),
      isConversationViewDisabled,
      timings: Object.assign(({
        responseStart: global.performance&&global.performance.timing.responseStart,
        responseEnd: global.performance&&global.performance.timing.responseEnd,
        domLoading: global.performance&&global.performance.timing.domLoading,
        domInteractive: global.performance&&global.performance.timing.domInteractive,
        domComplete: global.performance&&global.performance.timing.domComplete
      }:any), driver.getTimings())
    });
  });
}
