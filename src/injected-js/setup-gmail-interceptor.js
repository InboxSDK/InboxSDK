var _ = require('lodash');
var RSVP = require('rsvp');
var XHRProxyFactory = require('./xhr-proxy-factory');
var threadIdentifier = require('./thread-identifier');
var stringify = require('querystring').stringify;

function setupGmailInterceptor() {
  threadIdentifier.setup();

  var win = top.document.getElementById('js_frame').contentDocument.defaultView;
  var originalXHR = win.XMLHttpRequest;

  var wrappers = [];
  var XHRProxy = XHRProxyFactory(originalXHR, wrappers);
  win.XMLHttpRequest = XHRProxy;

  //email sending notifier
  wrappers.push({
    isRelevantTo: function(connection) {
      return connection.params.act === 'sm';
    },
    originalSendBodyLogger: function(connection, body) {
      triggerEvent({
        type: 'emailSending',
        body: body
      });
    },
    afterListeners: function(connection) {
      if(connection.status === 200) {
        triggerEvent({
          type: 'emailSent',
          responseText: connection.originalResponseText,
          originalSendBody: connection.originalSendBody
        });
      }
    }
  });

  wrappers.push({
    isRelevantTo: function(connection) {
      return connection.params.search && connection.params.view === 'tl';
    },
    responseTextChanger: function(connection, responseText) {
      // Presence of a responseTextChanger blocks Gmail from getting the partial
      // values as this loads. We want our originalResponseTextLogger to run
      // before Gmail has seen any of the response.
      return responseText;
    },
    originalResponseTextLogger: function(connection) {
      if (connection.status === 200) {
        var search = connection.params.search;
        var responseText = connection.originalResponseText;

        threadIdentifier.processThreadListResponse(responseText);
      }
    }
  });

  // Search query replacer.
  // The content script tells us search terms to watch for. Whenever we see a
  // search query containing the term, we delay it being sent out, trigger an
  // event containing the full query, and wait for a response event from the
  // content script that contains a new query to substitute in.
  var customSearchTerms = [];
  var queryReplacement;

  document.addEventListener('inboxSDKcreateCustomSearchTerm', function(event) {
    customSearchTerms.push(event.detail.term);
  });

  document.addEventListener('inboxSDKsearchReplacementReady', function(event) {
    // Go through all the queries, resolve the matching ones, and then remove
    // them from the list.
    if (queryReplacement.query === event.detail.query) {
      queryReplacement.newQuery.resolve(event.detail.newQuery);
    }
  });

  wrappers.push({
    isRelevantTo: function(connection) {
      var customSearchTerm;
      var params = connection.params;
      if (
        connection.method === 'POST' &&
        params.search && params.view === 'tl' &&
        connection.url.match(/^\?/) &&
        params.q &&
        (customSearchTerm = _.intersection(customSearchTerms, params.q.split(' '))[0])
      ) {
        if (queryReplacement && queryReplacement.query === params.q && queryReplacement.start != params.start) {
          // If this is the same query that was made last, but just for a
          // different page, then re-use the replacement query we got last time.
          // Don't wait on the extension to come up with it again (and risk it
          // giving an inconsistent answer between pages).
          connection._queryReplacement = queryReplacement;
          // Mark the old queryReplacement with this page now so we can tell on
          // a later request whether the page was changed or the list refresh
          // button was hit.
          queryReplacement.start = params.start;
        } else {
          if (queryReplacement) {
            // Resolve the old one with something because no one else is going
            // to after it's replaced in a moment.
            queryReplacement.newQuery.resolve(queryReplacement.query);
          }
          queryReplacement = connection._queryReplacement = {
            term: customSearchTerm,
            query: params.q,
            start: params.start,
            newQuery: RSVP.defer()
          };
          triggerEvent({
            type: 'searchQueryForReplacement',
            term: customSearchTerm,
            query: params.q
          });
        }
        return true;
      }
      return false;
    },
    requestChanger: function(connection, request) {
      return connection._queryReplacement.newQuery.promise.then(function(newQuery) {
        var newParams = _.clone(connection.params);
        newParams.q = newQuery;
        return {
          method: request.method,
          url: '?'+stringify(newParams),
          body: request.body
        };
      });
    }
  });
}

function triggerEvent(detail) {
  var event = document.createEvent("CustomEvent");
  event.initCustomEvent('inboxSDKajaxIntercept', true, false, detail);
  document.dispatchEvent(event);
}

module.exports = setupGmailInterceptor;
