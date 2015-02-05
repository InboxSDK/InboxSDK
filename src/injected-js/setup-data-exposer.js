var _ = require('lodash');

function stupidToBool(stupid) {
  switch (''+stupid) {
    case '1':
    case 't':
    case 'true':
      return true;
    default:
      return false;
  }
}

function getSettingValue(settings, name) {
  const entry = _.find(settings, (setting) => setting[0] === name);
  return entry ? stupidToBool(entry[1]) : false;
}

module.exports = function() {
  document.head.setAttribute('data-inboxsdk-user-email-address', GLOBALS[10]);
  document.head.setAttribute('data-inboxsdk-user-language', GLOBALS[4].split('.')[1]);

  const globalSettings = _.find(GLOBALS[17], (item) => item[0] === 'p')[1];
  {
    const previewPaneLabEnabled = getSettingValue(globalSettings, 'bx_lab_1252');
    const previewPaneEnabled = getSettingValue(globalSettings, 'bx_spa');
    const previewPaneVertical = getSettingValue(globalSettings, 'bx_spo');
    const previewPaneMode = (previewPaneLabEnabled && previewPaneEnabled) ?
      (previewPaneVertical ? 'vertical' : 'horizontal') : 'none';
    document.head.setAttribute('data-inboxsdk-user-preview-pane-mode', previewPaneMode);
  }
};
