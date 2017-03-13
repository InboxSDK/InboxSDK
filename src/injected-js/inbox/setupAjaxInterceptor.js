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

  let currentSuggestionsQuery;
  main_wrappers.push({
    isRelevantTo(connection) {
      if (/sync\/u\/\d+\/suggest/.test(connection.url)) {
        // we only want to keep track of the most recent search —
        // if the user is typing 'hello' there's no point in worrying about
        // each of the individual letters. In fact, sending them to our
        // suggestion-handling code leads to extra complexity.
        currentSuggestionsQuery = connection;
        return true;
      } else {
        return false;
      }
    },
    afterListeners: function(connection) {
      if (
        connection.status === 200 &&
        connection.originalSendBody &&
        connection === currentSuggestionsQuery
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
