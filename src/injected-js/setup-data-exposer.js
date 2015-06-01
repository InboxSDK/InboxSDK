import _ from 'lodash';
import logError from './log-error';
import waitFor from '../platform-implementation-js/lib/wait-for';

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

function getUserNameForEmail(userEmail) {
  if (global.GLOBALS) {
    return _.chain(GLOBALS[17])
      .find(e => e[0] === 'mla')
      .get(1)
      .find(e => e[0] === userEmail)
      .get(4)
      .value();
  }
  // pop-out windows, inbox
  const acctButton = document.querySelector('a.gb_ga.gb_l.gb_r[title]');
  if (acctButton) {
    return acctButton.title.match(/:\s+(.*\S)\s+\([^)]+\)/)[1];
  }
}

module.exports = function() {
  waitFor(() => global.GLOBALS || global.gbar).then(() => {
    const userEmail = global.GLOBALS ?
      GLOBALS[10] : gbar._CONFIG[0][10][5];
    document.head.setAttribute('data-inboxsdk-user-email-address', userEmail);
    const userName = getUserNameForEmail(userEmail);
    if (!userName) {
      const mla = global.GLOBALS && GLOBALS[17] && _.find(GLOBALS[17], e => e[0] === 'mla');
      logError(new Error("Failed to parse user info"), {
        GLOBALSpresent: !!global.GLOBALS,
        GLOBALS17present: !!(global.GLOBALS && GLOBALS[17]),
        mlaPresent: !!mla,
        mla1Length: mla && mla[1] && mla[1].length
      });
    }
    document.head.setAttribute('data-inboxsdk-user-name', userName);

    const userLanguage = global.GLOBALS ?
      GLOBALS[4].split('.')[1] : gbar._CONFIG[0][0][4];
    document.head.setAttribute('data-inboxsdk-user-language', userLanguage);

    if (global.GLOBALS) {
      document.head.setAttribute('data-inboxsdk-ik-value', GLOBALS[9]);

      const globalSettingsHolder = _.find(GLOBALS[17], (item) => item[0] === 'p');

      if(!globalSettingsHolder){
        logError(new Error('failed to find globalSettings'), {
          GLOBALSpresent: !!global.GLOBALS,
          GLOBALS17present: !!(global.GLOBALS && GLOBALS[17])
        });
      }
      else{
        const globalSettings = globalSettingsHolder[1];
        {
          const previewPaneLabEnabled = getSettingValue(globalSettings, 'bx_lab_1252');
          const previewPaneEnabled = getSettingValue(globalSettings, 'bx_spa');
          const previewPaneVertical = getSettingValue(globalSettings, 'bx_spo');
          const previewPaneMode = (previewPaneLabEnabled && previewPaneEnabled) ?
            (previewPaneVertical ? 'vertical' : 'horizontal') : 'none';
          document.head.setAttribute('data-inboxsdk-user-preview-pane-mode', previewPaneMode);
        }
      }
    }
  }).catch(logError);
};
