/* @flow */

import isEqual from 'lodash/isEqual';
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

  main_wrappers.push({
    isRelevantTo(connection) {
      return /sync(?:\/u\/\d+)?\/i\/s/.test(connection.url);
    },
    originalSendBodyLogger(connection) {
      if (connection.originalSendBody) {
        const originalRequest = JSON.parse(connection.originalSendBody);
        const updateContainer = find(originalRequest, value => (
          typeof value === 'object' && Object.keys(value).length === 1
        ));
        if (!updateContainer) return;

        const updateList = updateContainer[Object.keys(updateContainer)[0]];
        if (!updateList || updateList.length !== 1) return;

        const updateDescriptor = updateList[0] && updateList[0]['2'];
        const updateDescriptorDetails = (
          updateDescriptor['2'] &&
          updateDescriptor['2']['14'] &&
          updateDescriptor['2']['14']['1']
        );
        if (!updateDescriptorDetails) return;

        const draftID = (
          updateDescriptorDetails['1'] &&
          updateDescriptorDetails['1'].replace('msg-a:', '')
        );
        const actionList = updateDescriptorDetails['11'];

        const isSendRequest = isEqual(actionList, [
          '^pfg', '^f_bt', '^f_btns', '^f_cl', '^i', '^u'
        ]);

        if (isSendRequest) {
          triggerEvent({type: 'emailSending', draftID});
        }
      }
    }
  });
}
