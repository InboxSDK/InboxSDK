var _ = require('lodash');
var RSVP = require('rsvp');
var XHRProxyFactory = require('./xhr-proxy-factory');
var querystring = require('querystring');
var threadIdentifier = require('./thread-identifier');
var stringify = querystring.stringify;
var quotedSplit = require('../common/quoted-split');
var modifySuggestions = require('./modify-suggestions');

function setupGmailInterceptor() {
  threadIdentifier.setup();

  const js_frame_wrappers = [], main_wrappers = [];
  {
    const js_frame = top.document.getElementById('js_frame').contentDocument.defaultView;
    const js_frame_originalXHR = js_frame.XMLHttpRequest;
    js_frame.XMLHttpRequest = XHRProxyFactory(js_frame_originalXHR, js_frame_wrappers);
  }
  {
    const main_originalXHR = top.XMLHttpRequest;
    top.XMLHttpRequest = XHRProxyFactory(main_originalXHR, main_wrappers);
  }

  //email sending notifier
  js_frame_wrappers.push({
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

  js_frame_wrappers.push({
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

  // Search suggestions modifier
  // The content scripts tell us when they're interested in adding
  // modifications to future suggestion results. When we see a search
  // suggestions request come through, we signal the query string to the content
  // scripts, wait for the same number of responses as the number of registered
  // suggestion modifiers, and then meld them into the query response.
  {
    let modifierCount = 0;
    let currentQuery;
    let suggestionModifications;
    let currentQueryDefer;

    document.addEventListener('inboxSDKregisterSuggestionsModifier', function(event) {
      modifierCount++;
    });

    document.addEventListener('inboxSDKprovideSuggestions', function(event) {
      if (event.detail.query === currentQuery) {
        suggestionModifications.push(event.detail.suggestions);
        if (suggestionModifications.length === modifierCount) {
          currentQueryDefer.resolve(_.flatten(suggestionModifications, true));
          currentQueryDefer = currentQuery = suggestionModifications = null;
        }
      }
    });

    main_wrappers.push({
      isRelevantTo: function(connection) {
        return modifierCount > 0 &&
          connection.url.match(/^\/cloudsearch\/request\?/) &&
          connection.params.client == 'gmail' &&
          connection.params.gs_ri == 'gmail';
      },
      originalSendBodyLogger: function(connection, body) {
        const parsedBody = querystring.parse(body);
        if (!parsedBody.request) {
          return;
        }
        const query = JSON.parse(parsedBody.request)[2];
        if (!query) {
          return;
        }
        currentQuery = query;
        if (currentQueryDefer)
          currentQueryDefer.resolve();
        currentQueryDefer = connection._defer = RSVP.defer();
        suggestionModifications = [];
        triggerEvent({
          type: 'suggestionsRequest',
          query: currentQuery
        });
      },
      responseTextChanger: function(connection, responseText) {
        if (connection._defer) {
          return connection._defer.promise.then((modifications) => {
            if (!modifications) {
              return responseText;
            } else {
              return modifySuggestions(responseText, modifications);
            }
          });
        }
        return responseText;
      }
    });
  }

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

  js_frame_wrappers.push({
    isRelevantTo: function(connection) {
      var customSearchTerm;
      var params = connection.params;
      if (
        connection.method === 'POST' &&
        params.search && params.view === 'tl' &&
        connection.url.match(/^\?/) &&
        params.q &&
        (customSearchTerm = _.intersection(customSearchTerms, quotedSplit(params.q))[0])
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
