const gmailElementGetter = require('../gmail-element-getter');

module.exports = function gmailLoadEvent(driver) {
  const pageCommunicator = driver.getPageCommunicator();

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
};
