/* @flow */

import find from 'lodash/find';
import * as logger from './injected-logger';
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
  var entry = find(settings, (setting) => setting[0] === name);
  return entry ? stupidToBool(entry[1]) : false;
}

module.exports = function() {
  waitFor(() => global.GLOBALS || global.gbar).then(() => {
    var userEmail = global.GLOBALS ?
      GLOBALS[10] : gbar._CONFIG[0][10][5];
    (document.head:any).setAttribute('data-inboxsdk-user-email-address', userEmail);

    var userLanguage: string = global.GLOBALS ?
      GLOBALS[4].split('.')[1] : gbar._CONFIG[0][0][4];
    (document.head:any).setAttribute('data-inboxsdk-user-language', userLanguage);

    if (global.GLOBALS) {
      (document.head:any).setAttribute('data-inboxsdk-ik-value', GLOBALS[9]);
      (document.head:any).setAttribute('data-inboxsdk-action-token-value', global.GM_ACTION_TOKEN);

      var globalSettingsHolder = find(GLOBALS[17], (item) => item[0] === 'p');

      if(!globalSettingsHolder){
        logger.error(new Error('failed to find globalSettings'), {
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
          (document.head:any).setAttribute('data-inboxsdk-user-preview-pane-mode', previewPaneMode);
        }
      }
    } else {
      const preloadDataSearchString = 'window.BT_EmbeddedAppData=[';
      const preloadScript = find(document.querySelectorAll('script:not([src])'), script =>
        script.text && script.text.slice(0,500).indexOf(preloadDataSearchString) > -1
      );
      if (!preloadScript) {
        logger.error(new Error("Could not read preloaded BT_EmbeddedAppData"));
      } else {
        const {text} = preloadScript;
        const firstBracket = text.indexOf('window.BT_EmbeddedAppData=[');
        const lastBracket = (
          // I have only seen the case where there is a new line between the
          // closing bracket and the semicolon, but want to be defensive in
          // case that changes.
          text.indexOf(']\n;', firstBracket) ||
          text.indexOf('];', firstBracket)
        );
        const preloadData = JSON.parse(text.slice(
          firstBracket + preloadDataSearchString.length - 1,
          lastBracket + 1
        ));

        (document.head:any).setAttribute('data-inboxsdk-ik-value', preloadData[11]);
      }
    }
  }).catch(err => {
    function getStatus() {
      return {
        hasGLOBALS: !!global.GLOBALS,
        hasGbar: !!global.gbar
      };
    }
    var startStatus = getStatus();
    var waitTime = 180*1000;
    setTimeout(() => {
      var laterStatus =  getStatus();
      logger.eventSdkPassive('waitfor global data', {
        startStatus, waitTime, laterStatus
      });
    }, waitTime);
    throw err;
  }).catch(logger.error);
};
