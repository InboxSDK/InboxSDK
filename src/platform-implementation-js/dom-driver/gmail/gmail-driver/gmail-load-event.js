const gmailElementGetter = require('../gmail-element-getter');

module.exports = function gmailLoadEvent(driver) {
  const pageCommunicator = driver.getPageCommunicator();

  driver.getLogger().eventGmail('gmailLoaded', {
    language: pageCommunicator.getUserLanguage(),
    previewPane: pageCommunicator.getUserOriginalPreviewPaneMode()
    // isConversationViewDisabled: Gmail.isConversationViewDisabled()
  });
};
