/* @flow */
// jshint ignore:start

import _ from 'lodash';
import logError from './log-error';
import waitFor from '../platform-implementation-js/lib/wait-for';

declare var GLOBALS: any[];
declare var gbar: {_CONFIG: any[]};

function stupidToBool(stupid: any): boolean {
  switch (''+stupid) {
    case '1':
    case 't':
    case 'true':
      return true;
    default:
      return false;
  }
}

function getSettingValue(settings: any[], name: string): boolean {
  var entry = _.find(settings, (setting) => setting[0] === name);
  return entry ? stupidToBool(entry[1]) : false;
}

module.exports = function() {
  waitFor(() => global.GLOBALS || global.gbar).then(() => {
    var userEmail = global.GLOBALS ?
      GLOBALS[10] : gbar._CONFIG[0][10][5];
    document.head.setAttribute('data-inboxsdk-user-email-address', userEmail);

    var userLanguage: string = global.GLOBALS ?
      GLOBALS[4].split('.')[1] : gbar._CONFIG[0][0][4];
    document.head.setAttribute('data-inboxsdk-user-language', userLanguage);

    if (global.GLOBALS) {
      document.head.setAttribute('data-inboxsdk-ik-value', GLOBALS[9]);

      var globalSettingsHolder = _.find(GLOBALS[17], (item) => item[0] === 'p');

      if(!globalSettingsHolder){
        logError(new Error('failed to find globalSettings'), {
          GLOBALSpresent: !!global.GLOBALS,
          GLOBALS17present: !!(global.GLOBALS && GLOBALS[17])
        });
      }
      else{
        var globalSettings = globalSettingsHolder[1];
        {
          var previewPaneLabEnabled = getSettingValue(globalSettings, 'bx_lab_1252');
          var previewPaneEnabled = getSettingValue(globalSettings, 'bx_spa');
          var previewPaneVertical = getSettingValue(globalSettings, 'bx_spo');
          var previewPaneMode = (previewPaneLabEnabled && previewPaneEnabled) ?
            (previewPaneVertical ? 'vertical' : 'horizontal') : 'none';
          document.head.setAttribute('data-inboxsdk-user-preview-pane-mode', previewPaneMode);
        }
      }
    }
  }).catch(logError);
};
