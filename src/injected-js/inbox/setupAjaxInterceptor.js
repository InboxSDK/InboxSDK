/* @flow */

import intersection from 'lodash/intersection';
import censorJSONTree from '../../common/censorJSONTree';
import * as logger from '../injected-logger';
import XHRProxyFactory from '../xhr-proxy-factory';

import type {XHRProxyConnectionDetails} from '../xhr-proxy-factory';

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

  global.XMLHttpRequest = XHRProxyFactory(
    global.XMLHttpRequest, main_wrappers, {logError: logErrorExceptEventListeners}
  );

  {
    let currentSuggestionsConnection;
    main_wrappers.push({
      isRelevantTo(connection) {
        if (/sync(?:\/u\/\d+)?\/suggest/.test(connection.url)) {
          // we only want to keep track of the most recent search —
          // if the user is typing 'hello' there's no point in worrying about
          // each of the individual letters. In fact, sending them to our
          // suggestion-handling code leads to extra complexity.
          currentSuggestionsConnection = connection;
          return true;
        } else {
          return false;
        }
      },
      afterListeners(connection) {
        if (
          connection.status === 200 &&
          connection.originalSendBody &&
          connection === currentSuggestionsConnection
        ) {
          const originalRequest = JSON.parse(connection.originalSendBody);
          // The suggestions request object contains two keys — one is always '1',
          // the other is a number that seems somewhat consistent but not consistent
          // enough to be safe to hard-code. The search query lives inside the
          // property the latter property.
          const queryKey = Object.keys(originalRequest).find(key => key !== '1');
          // Descend into the object that has the query inside it.
          const queryObj = originalRequest[queryKey];
          // When an empty search box is first focused, a suggestions request
          // goes out that is some kind of special query (it doesn't include
          // a user-supplied query). This initial request has multiple keys inside
          // the object that usually contains the query, so we avoid taking action
          // on requests where the object that contains the query has more
          // than one key. If we confirm that there is only a single key, we grab
          // the value out of the '1' key since that is always what holds a
          // user-supplied query.
          const query = Object.keys(queryObj).length === 1 && queryObj['1'];

          if (query) {
            triggerEvent({type: 'searchSuggestionsReceieved', query});
          }
        }
      }
    });
  }

  {
    let isComposeViewSending = false;
    document.addEventListener('inboxSDKcomposeViewIsSending', () => (
      isComposeViewSending = true
    ));
    const logIfParseFailed = (request, actionList) => {
      if (!isComposeViewSending) return;

      logger.error(
        new Error ('Failed to identify outgoing send request'),
        {requestPayload: censorJSONTree(request), actionList}
      );

      isComposeViewSending = false;
    };

    const SEND_ACTIONS = ["^pfg", "^f_bt", "^f_btns", "^f_cl"];
    const currentConnectionIDs: WeakMap<XHRProxyConnectionDetails, string> = new WeakMap();
    main_wrappers.push({
      isRelevantTo(connection) {
        return /sync(?:\/u\/\d+)?\/i\/s/.test(connection.url);
      },
      originalSendBodyLogger(connection) {
        if (connection.originalSendBody) {
          const originalRequest = JSON.parse(connection.originalSendBody);

          const updateList = (
            originalRequest['2'] &&
            originalRequest['2']['1']
          );
          if (!updateList) {
            logIfParseFailed(originalRequest);
            return;
          }

          const sendUpdateMatch = updateList.find((update) => (
            update['2'] &&
            update['2']['2'] &&
            update['2']['2']['14'] &&
            update['2']['2']['14']['1'] &&
            update['2']['2']['14']['1']['1'] &&
            update['2']['2']['14']['1']['1'].indexOf('msg-a:') > -1
          ));
          if (!sendUpdateMatch) {
            logIfParseFailed(originalRequest);
            return;
          }

          const sendUpdate = (
            sendUpdateMatch['2'] &&
            sendUpdateMatch['2']['2'] &&
            sendUpdateMatch['2']['2']['14'] &&
            sendUpdateMatch['2']['2']['14']['1']
          );

          const draftID = (
            sendUpdate['1'] &&
            sendUpdate['1'].replace('msg-a:', '')
          );
          const actionList = sendUpdate['11'];
          if (!(actionList && draftID)) {
            logIfParseFailed(originalRequest);
            return;
          }

          const isSendRequest = (
            intersection(actionList, SEND_ACTIONS).length === SEND_ACTIONS.length
          );

          if (isSendRequest) {
            currentConnectionIDs.set(connection, draftID);
            triggerEvent({type: 'emailSending', draftID});
            isComposeViewSending = false;
          } else {
            logIfParseFailed(originalRequest, actionList);
          }
        }
      },
      afterListeners(connection) {
        if (currentConnectionIDs.has(connection)) {
          const sendFailed = () => {
            triggerEvent({type: 'emailSendFailed', draftID});
            currentConnectionIDs.delete(connection);
          };

          const draftID = currentConnectionIDs.get(connection);

          if (connection.status !== 200 || !connection.originalResponseText) {
            sendFailed();
            return;
          }

          const originalResponse = JSON.parse(connection.originalResponseText);

          const updateList = (
            originalResponse['2'] &&
            originalResponse['2']['6']
          );
          if (!updateList) {
            sendFailed();
            return;
          }

          const sendUpdateMatch = updateList.find((update) => (
            update['1'] &&
            update['1']['3'] &&
            update['1']['3']['7'] &&
            update['1']['3']['7']['1'] &&
            update['1']['3']['7']['1']['5'] &&
            update['1']['3']['7']['1']['5'][0] &&
            update['1']['3']['7']['1']['5'][0]['14']
          ));
          if (!sendUpdateMatch) {
            sendFailed();
            return;
          }

          const sendUpdate = (
            sendUpdateMatch['1'] &&
            sendUpdateMatch['1']['3'] &&
            sendUpdateMatch['1']['3']['7'] &&
            sendUpdateMatch['1']['3']['7']['1'] &&
            sendUpdateMatch['1']['3']['7']['1']['5'] &&
            sendUpdateMatch['1']['3']['7']['1']['5'][0]
          );

          const rfcID = sendUpdate['14'];

          triggerEvent({
            type: 'emailSent',
            rfcID,
            draftID
          });

          currentConnectionIDs.delete(connection);
        }
      }
    });
  }
}
