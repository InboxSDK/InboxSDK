/* @flow */

import isEqual from 'lodash/isEqual';
import difference from 'lodash/difference';
import * as logger from '../injected-logger';
import XHRProxyFactory from '../xhr-proxy-factory';

function logErrorExceptEventListeners(err, details) {
  // Don't log the page's own errors
  if (details !== 'XMLHttpRequest event listener error') {
    logger.error(err, details);
  } else {
    setTimeout(function() {
      // let window.onerror log this
      throw err;
    }, 1);
  }
}

function triggerEvent(detail) {
  document.dispatchEvent(new CustomEvent('inboxSDKajaxIntercept', {
    bubbles: true, cancelable: false,
    detail
  }));
}

export default function setupAjaxInterceptor() {
  const main_wrappers = [];

  // Only set up the interception for a fraction of sessions right now.
  // This has the benefit that if something goes wrong, then the user can
  // refresh and most likely not have interception present.
  const useXHRInterceptor = true; //Math.random() < 0.1;

  if (useXHRInterceptor) {
    global.XMLHttpRequest = XHRProxyFactory(
      global.XMLHttpRequest, main_wrappers, {logError: logErrorExceptEventListeners}
    );
    logger.eventSdkPassive('inboxUseXhrProxy');
  }

  // xhr proxy wrappers will go here eventually

  main_wrappers.push({
    isRelevantTo(connection) {
      return connection.url.indexOf('suggest') > -1;
    },
    afterListeners: function(connection) {
      console.log('afterListeners callback: ', connection);
      if (connection.status === 200 && connection.originalSendBody) {
        const originalRequest = JSON.parse(connection.originalSendBody);
        const queryKey = Object.keys(originalRequest).find(key => key !== '1');
        const queryObj = originalRequest[queryKey];
        const query = Object.keys(queryObj).length === 1 && queryObj['1'];

        if (query) {
          triggerEvent({type: 'searchSuggestionsReceieved', query});
        }
      }
    }
  });
}
