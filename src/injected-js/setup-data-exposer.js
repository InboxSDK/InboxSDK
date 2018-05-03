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

function getContext() {

  let context = global;
  try{
    if(global.opener && global.opener.top){
      // try to get href
      // if the opener is not gmail (i.e. you clicked on a mailto link on craigslist) then this will throw an error
      global.opener.top.location.href;
      context = global.opener.top;
    }
  }
  catch(err){
    context = global; //we got an error from requesting global.opener.top.location.href;
  }

  return context;
}

module.exports = function() {
  let context;
  waitFor(() => {
    context = getContext();
    return context && (context.GLOBALS || context.gbar);
  }).then(() => {
    if(!context) return;
    var userEmail = context.GLOBALS ?
      context.GLOBALS[10] : context.gbar._CONFIG[0][10][5];
    (document.head:any).setAttribute('data-inboxsdk-user-email-address', userEmail);

    var userLanguage: string = context.GLOBALS ?
      context.GLOBALS[4].split('.')[1] : context.gbar._CONFIG[0][0][4];
    (document.head:any).setAttribute('data-inboxsdk-user-language', userLanguage);


    (document.head:any).setAttribute('data-inboxsdk-using-sync-api', context.GM_SPT_ENABLED);
    (document.head:any).setAttribute('data-inboxsdk-using-material-ui', context.GM_RFT_ENABLED);


    if (context.GLOBALS) { // Gmail
      (document.head:any).setAttribute('data-inboxsdk-ik-value', context.GLOBALS[9]);
      (document.head:any).setAttribute('data-inboxsdk-action-token-value', context.GM_ACTION_TOKEN);

      var globalSettingsHolder = find(context.GLOBALS[17], (item) => item[0] === 'p');

      if(!globalSettingsHolder){
        // global settings doesn't exist on gmail v2, so we don't need to log this anymore
        return;
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
    } else { // Inbox
      const preloadDataSearchString = 'window.BT_EmbeddedAppData=[';
      const preloadScript = find(document.querySelectorAll('script:not([src])'), script =>
        script.text && script.text.slice(0,500).indexOf(preloadDataSearchString) > -1
      );
      if (!preloadScript) {
        logger.error(new Error("Could not read preloaded BT_EmbeddedAppData"));
      } else {
        const {text} = preloadScript;
        const firstBracket = text.indexOf('window.BT_EmbeddedAppData=[');
        let lastBracket = text.indexOf(']\n;', firstBracket);
        if (lastBracket === -1) {
          // I have only seen the case where there is a new line between the
          // closing bracket and the semicolon, but want to be defensive in
          // case that changes.
          lastBracket = text.indexOf('];', firstBracket);
        }
        const preloadData = JSON.parse(text.slice(
          firstBracket + preloadDataSearchString.length - 1,
          lastBracket + 1
        ));

        const ikValue = preloadData[11];
        if (typeof ikValue !== 'string') {
          logger.error(new Error("Could not find valid ikValue"));
        } else {
          (document.head:any).setAttribute('data-inboxsdk-ik-value', ikValue);
        }

        const xsrfToken = preloadData[12];
        if (typeof xsrfToken !== 'string') {
          logger.error(new Error("Could not find valid xsrfToken"));
        } else {
          (document.head:any).setAttribute('data-inboxsdk-xsrf-token', xsrfToken);
        }
      }
    }
  }).catch(err => {
    function getStatus() {
      return {
        hasGLOBALS: !!context.GLOBALS,
        hasGbar: !!context.gbar
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
