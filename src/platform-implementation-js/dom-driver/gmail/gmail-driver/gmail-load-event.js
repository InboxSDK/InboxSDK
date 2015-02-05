const gmailElementGetter = require('../gmail-element-getter');

module.exports = function gmailLoadEvent(driver) {
  const pageCommunicator = driver.getPageCommunicator();

  pageCommunicator.isConversationViewDisabled().then(isConversationViewDisabled => {
    driver.getLogger().eventGmail('gmailSettings', {
      language: pageCommunicator.getUserLanguage(),
      previewPane: pageCommunicator.getUserOriginalPreviewPaneMode(),
      isConversationViewDisabled
    });
  });
};
