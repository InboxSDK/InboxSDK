/* @flow */

import intersection from 'lodash/intersection';
import find from 'lodash/find';
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
    let sending = false;

    document.addEventListener('emailIsSending', () => {
      sending = true;
    });
    const SEND_ACTIONS = ["^pfg", "^f_bt", "^f_btns", "^f_cl"];
    const currentConnectionIDs = new WeakMap();
    main_wrappers.push({
      isRelevantTo(connection) {
        return /sync(?:\/u\/\d+)?\/i\/s/.test(connection.url);
      },
      originalSendBodyLogger(connection) {
        if (connection.originalSendBody) {
          const originalRequest = JSON.parse(connection.originalSendBody);
          if (sending) {
            const newAttr0 = JSON.parse((document: any).head.getAttribute('data-test-sdkDebugLog'));
            newAttr0.push(`originalRequest: ${JSON.stringify(originalRequest)}`);
            (document: any).head.setAttribute(
              'data-test-sdkDebugLog',
              JSON.stringify(newAttr0)
            );
          }
          const updateList = (
            originalRequest['2'] &&
            originalRequest['2']['1']
          );
          if (sending) {
            const newAttr1 = JSON.parse((document: any).head.getAttribute('data-test-sdkDebugLog'));
            newAttr1.push(`update list existence: ${JSON.stringify(updateList)}`);
            newAttr1.push(`update list length: ${updateList && updateList.length}`);
            (document: any).head.setAttribute(
              'data-test-sdkDebugLog',
              JSON.stringify(newAttr1)
            );
          }
          if (!updateList) return;

          // const updateDescriptor = updateList[0] && updateList[0]['2'];

          const sendUpdateMatch = updateList.find((update) => (
            update['2'] &&
            update['2']['2'] &&
            update['2']['2']['14'] &&
            update['2']['2']['14']['1'] &&
            update['2']['2']['14']['1']['1'] &&
            update['2']['2']['14']['1']['1'].indexOf('msg-a:') > -1
          ));
          // const updateDescriptorDetails = (
          //   updateDescriptor['2'] &&
          //   updateDescriptor['2']['14'] &&
          //   updateDescriptor['2']['14']['1']
          // );
          // if (!updateDescriptorDetails) return;
          if (!sendUpdateMatch) return;
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
          if (!(actionList && draftID)) return;

          const newAttr2 = JSON.parse((document: any).head.getAttribute('data-test-sdkDebugLog'));
          newAttr2.push('action tokens: ', actionList);
          newAttr2.push('is SEND_ACTIONS match', intersection(actionList, SEND_ACTIONS).length === SEND_ACTIONS.length);
          (document: any).head.setAttribute(
            'data-test-sdkDebugLog',
            JSON.stringify(newAttr2)
          );
          const isSendRequest = (
            intersection(actionList, SEND_ACTIONS).length === SEND_ACTIONS.length
          );

          if (isSendRequest) {
            const newAttr3 = JSON.parse((document: any).head.getAttribute('data-test-sdkDebugLog'));
            newAttr3.push('dispatching emailSending');
            (document: any).head.setAttribute(
              'data-test-sdkDebugLog',
              JSON.stringify(newAttr3)
            );
            currentConnectionIDs.set(connection, draftID);
            triggerEvent({type: 'emailSending', draftID});
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
          if (updateList) {
            const newAttr4 = JSON.parse((document: any).head.getAttribute('data-test-sdkDebugLog'));
            newAttr4.push(`updateList from resp: ${JSON.stringify(updateList)}`);
            newAttr4.push(`updateList length from resp: ${JSON.stringify(updateList.length)}`);
            (document: any).head.setAttribute(
              'data-test-sdkDebugLog',
              JSON.stringify(newAttr4)
            );
          }
          if (!updateList || updateList.length !== 1) {
            sendFailed();
            return;
          }

          const updateDescriptor = updateList[0] && updateList[0]['1'];
          const updateDescriptorDetails = (
            updateDescriptor['3'] &&
            updateDescriptor['3']['7'] &&
            updateDescriptor['3']['7']['1'] &&
            updateDescriptor['3']['7']['1']['5'] &&
            updateDescriptor['3']['7']['1']['5'][0]
          );

          const rfcID = updateDescriptorDetails['14'];
          if (!rfcID) {
            sendFailed();
            return;
          }

          const newAttr = JSON.parse((document: any).head.getAttribute('data-test-sdkDebugLog'));
          newAttr.push('dispatching emailSent');
          (document: any).head.setAttribute(
            'data-test-sdkDebugLog',
            JSON.stringify(newAttr)
          );
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
