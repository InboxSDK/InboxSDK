/* @flow */

import isEqual from 'lodash/isEqual';
import difference from 'lodash/difference';
import * as logger from '../injected-logger';
import XHRProxyFactory from '../xhr-proxy-factory';
import SuggestionsResponseModifier from './SuggestionsResponseModifier';

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
  const useXHRInterceptor = Math.random() < 0.1;

  if (useXHRInterceptor) {
    global.XMLHttpRequest = XHRProxyFactory(
      global.XMLHttpRequest, main_wrappers, {logError: logErrorExceptEventListeners}
    );
    logger.eventSdkPassive('inboxUseXhrProxy');
  }

  main_wrappers.push({
    isRelevantTo(connection) {
      return connection.method === 'POST' && /\/suggest(\?|$)/.test(connection.url);
    },
    originalSendBodyLogger(connection, body) {
      try {
        const parsed = JSON.parse(body);
        const rootKeys = Object.keys(parsed);

        const weirdness = [];
        if (!isEqual(rootKeys, ['1', '63893336'])) {
          weirdness.push({unexpectedRootKeys: rootKeys});
        }
        const qPart = parsed['63893336'];
        if (!qPart) {
          weirdness.push('missing query part');
        } else {
          const qKeys = Object.keys(qPart);
          if (!isEqual(qKeys, ['1'])) {
            weirdness.push({unexpectedQueryKeys: qKeys});
          }
        }

        if (weirdness.length) {
          logger.error(new Error('Suggestion Request Parse Failure'), {
            type: 'interceptSuggestRequest',
            weirdness
          });
        } else {
          logger.eventSdkPassive('inboxSuggestRequestParseSuccess');
        }
      } catch (err) {
        logger.error(err, {type: 'interceptSuggestRequest'});
      }
    },
    originalResponseTextLogger(connection, responseText) {
      if (connection.status !== 200) {
        return;
      }
      const response = new SuggestionsResponseModifier(responseText);
      const warning = response.getWarningError();
      if (warning) {
        logger.error(warning);
      } else {
        logger.eventSdkPassive('inboxSuggestResponseParseNoWarnings');
      }
    }
  });
}
