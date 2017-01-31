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
      try {
        const parsed = JSON.parse(responseText);

        const weirdness = [];
        if (!Array.isArray(parsed)) {
          weirdness.push('response was not array');
        } else {
          if (parsed.length !== 2) {
            weirdness.push({unexpectedLength: parsed.length});
          }

          const firstPart = parsed[0];
          if (!firstPart) {
            weirdness.push('missing first part');
          } else {
            const firstKeys = Object.keys(firstPart);
            if (!isEqual(firstKeys, ['55684698'])) {
              weirdness.push({unexpectedFirstKeys: firstKeys});
            }
            const mainPart = firstPart['55684698'];
            if (!mainPart) {
              weirdness.push('missing main part');
            } else {
              const mainKeys = Object.keys(mainPart);
              if (!isEqual(mainKeys, ['2']) && !isEqual(mainKeys, ['1', '2'])) {
                weirdness.push({unexpectedMainKeys: mainKeys});
              }
              const listPart = mainPart[1];
              if (listPart) {
                if (!Array.isArray(listPart)) {
                  weirdness.push('list part is not array');
                } else {
                  listPart.forEach(contactPart => {
                    const contactKeys = Object.keys(contactPart);
                    if (
                      !contactPart['1'] || difference(contactKeys, ['1','2','3','4','6']).length
                    ) {
                      weirdness.push({unexpectedContactKeys: contactKeys});
                    }
                    contactKeys.forEach(key => {
                      if (typeof contactPart[key] !== (key === '4' ? 'number' : 'string')) {
                        weirdness.push({wrongType: typeof contactPart[key], key});
                      }
                    })
                  });
                }
              }
            }
          }
        }

        if (weirdness.length) {
          logger.error(new Error('Suggestion Response Parse Failure'), {
            type: 'interceptSuggestResponse',
            weirdness,
            response: JSON.stringify(parsed, (k,v) => {
              const t = typeof v;
              return (t === 'string' || t === 'number') ? t : v;
            })
          });
        } else {
          logger.eventSdkPassive('inboxSuggestResponseParseSuccess');
        }
      } catch (err) {
        logger.error(err, {
          type: 'interceptSuggestResponse',
          responseLength: responseText && responseText.length
        });
      }
    }
  });
}
