const gmailElementGetter = require('../gmail-element-getter');

module.exports = function gmailLoadEvent(driver) {
  const pageCommunicator = driver.getPageCommunicator();

  driver.getLogger().eventGmail('gmailSettings', {
    language: pageCommunicator.getUserLanguage(),
    previewPane: pageCommunicator.getUserOriginalPreviewPaneMode()
    // isConversationViewDisabled: Gmail.isConversationViewDisabled()
  });
};
