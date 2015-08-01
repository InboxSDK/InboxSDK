/* @flow */
//jshint ignore:start

import gmailElementGetter from '../gmail-element-getter';
import type GmailDriver from '../gmail-driver';

export default function gmailLoadEvent(driver: GmailDriver) {
  var pageCommunicator = driver.getPageCommunicator();

  pageCommunicator.isConversationViewDisabled().then(isConversationViewDisabled => {
    driver.getLogger().eventGmail('gmailSettings', {
      screenWidth: window.screen && window.screen.width,
      screenHeight: window.screen && window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      language: pageCommunicator.getUserLanguage(),
      previewPane: pageCommunicator.getUserOriginalPreviewPaneMode(),
      isConversationViewDisabled
    });
  });
}
