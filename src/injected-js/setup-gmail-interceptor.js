/* @flow */

import _ from 'lodash';
import RSVP from 'rsvp';
import Kefir from 'kefir';
import * as logger from './injected-logger';
import XHRProxyFactory from './xhr-proxy-factory';
import querystring, {stringify} from 'querystring';
import * as threadIdentifier from './thread-identifier';
import quotedSplit from '../common/quoted-split';
import modifySuggestions from './modify-suggestions';

function logErrorExceptEventListeners(err, details) {
  // Don't log Gmail's errors
  if (details !== 'XMLHttpRequest event listener error') {
    logger.error(err, details);
  } else {
    setTimeout(function() {
      // let window.onerror log this
      throw err;
    }, 1);
  }
}

export default function setupGmailInterceptor() {
  const js_frame_wrappers = [], main_wrappers = [];
  {
    const js_frame_element = top.document.getElementById('js_frame');
    if (js_frame_element) {
      threadIdentifier.setup();

      const js_frame = js_frame_element.contentDocument.defaultView;
      const js_frame_originalXHR = js_frame.XMLHttpRequest;
      js_frame.XMLHttpRequest = XHRProxyFactory(
        js_frame_originalXHR, js_frame_wrappers, {logError: logErrorExceptEventListeners});
    }
    else{
      logger.eventSdkPassive('noJSFrameElementFound');
    }
  }
  {
    const main_originalXHR = top.XMLHttpRequest;
    top.XMLHttpRequest = XHRProxyFactory(
      main_originalXHR, main_wrappers, {logError: logErrorExceptEventListeners});
  }

  //email sending modifier/notifier
  {
    let modifiers: {[key: string]: Array<string>} = {};


    Kefir.fromEvents(document, 'inboxSDKregisterComposeRequestModifier')
          .onValue(({detail}) => {
            if(!modifiers[detail.compoesid]){
              modifiers[detail.composeid] = [];
            }

            modifiers[detail.composeid].push(detail.modifierId);
          });


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
      requestChanger: async function(connection, request) {

        let composeParams = querystring.parse(request.body);
        const composeid = composeParams.composeid;
        const composeModifierIds = modifiers[composeParams.composeid];

        if(!composeModifierIds || composeModifierIds.length === 0){
          return request;
        }

        for(let ii=0; ii<composeModifierIds.length; ii++) {
          const modifierId = composeModifierIds[ii];

          const modificationPromise = Kefir.fromEvents(document, 'inboxSDKcomposeRequestModified')
                                            .filter(({detail}) => detail.composeid === composeid && detail.modifierId === modifierId)
                                            .take(1)
                                            .map(({detail}) => detail.composeParams)
                                            .toPromise(Promise);

          triggerEvent({
            type: 'inboxSDKmodifyComposeRequest',
            composeid,
            modifierId,
            composeParams: {
              body: composeParams.body
            }
          });

          let newComposeParams = await modificationPromise;
          composeParams = Object.assign({}, composeParams, newComposeParams);

        }

        return Object.assign({}, request, {body: stringifyComposeParams(composeParams)});
      },
      afterListeners: function(connection) {
        if(connection.status === 200) {
          triggerEvent({
            type: 'emailSent',
            responseText: connection.originalResponseText,
            originalSendBody: connection.originalSendBody
          });

          const composeParams = querystring.parse(connection.originalSendBody);
          delete modifiers[composeParams.composeid];
        }
      }
    });
  }

  js_frame_wrappers.push({
    isRelevantTo: function(connection) {
      return connection.params.act === 'sd';
    },
    originalSendBodyLogger: function(connection, body) {
      triggerEvent({
        type: 'emailDraftSaveSending',
        body: body
      });
    },
    afterListeners: function(connection) {
      if(connection.status === 200) {
        triggerEvent({
          type: 'emailDraftReceived',
          responseText: connection.originalResponseText,
          originalSendBody: connection.originalSendBody,
          connectionDetails: {
            method: connection.method,
            url: connection.url,
            params: connection.params,
            responseType: connection.responseType
          }
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
    const providers = {};
    let currentQuery;
    let suggestionModifications;
    let currentQueryDefer;

    document.addEventListener('inboxSDKregisterSuggestionsModifier', function({detail}: any) {
      providers[detail.providerID] = {position: Object.keys(providers).length};
    });

    document.addEventListener('inboxSDKprovideSuggestions', function({detail}: any) {
      if (detail.query === currentQuery) {
        const provider = providers[detail.providerID];
        if(!provider){
          throw new Error('provider does not exist for providerID');
        }

        if(suggestionModifications == null){
          throw new Error('tried to modified a null suggestionModifications');
        }

        suggestionModifications[provider.position] = detail.suggestions;
        if (suggestionModifications.filter(Boolean).length === Object.keys(providers).length) {
          if(currentQueryDefer == null){
            throw new Error('tried to resolve a null currentQueryDefer');
          }
          currentQueryDefer.resolve(_.flatten(suggestionModifications));
          currentQueryDefer = currentQuery = suggestionModifications = null;
        }
      }
    });

    main_wrappers.push({
      isRelevantTo: function(connection) {
        return Object.keys(providers).length > 0 &&
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

  {
    // TODO: simplify this code
    // the triggerEvent call should happen in the requestChanger callback
    // and a lot of these state variables can be stored in the closure

    // Search query replacer.
    // The content script tells us search terms to watch for. Whenever we see a
    // search query containing the term, we delay it being sent out, trigger an
    // event containing the full query, and wait for a response event from the
    // content script that contains a new query to substitute in.
    const customSearchTerms = [];
    let queryReplacement;

    document.addEventListener('inboxSDKcreateCustomSearchTerm', function(event: any) {
      customSearchTerms.push(event.detail.term);
    });

    document.addEventListener('inboxSDKsearchReplacementReady', function(event: any) {
      if (queryReplacement.query === event.detail.query) {
        queryReplacement.newQuery.resolve(event.detail.newQuery);
      }
    });

    js_frame_wrappers.push({
      isRelevantTo: function(connection) {
        var customSearchTerm;
        const params = connection.params;
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

  {
    // Search results replacer.
    // The content script tells us a search query to watch for. Whenever we see
    // the search query, trigger an event containing the query, trigger an
    // event containing the response, and then wait for a response event from
    // the content script that contains new results to substitute in.
    const customSearchQueries = [];
    let customListJob;

    document.addEventListener('inboxSDKcustomListRegisterQuery', (event: any) => {
      customSearchQueries.push(event.detail.query);
    });

    document.addEventListener('inboxSDKcustomListNewQuery', (event: any) => {
      if (customListJob.query === event.detail.query) {
        customListJob.newQuery.resolve(event.detail.newQuery);
      }
    });

    document.addEventListener('inboxSDKcustomListResults', (event: any) => {
      if (customListJob.query === event.detail.query) {
        customListJob.newResults.resolve(event.detail.newResults);
      }
    });

    js_frame_wrappers.push({
      isRelevantTo: function(connection) {
        let customSearchQuery;
        const params = connection.params;
        if (
          connection.method === 'POST' &&
          params.search && params.view === 'tl' &&
          connection.url.match(/^\?/) &&
          params.q &&
          (customSearchQuery = _.find(customSearchQueries, x => x === params.q))
        ) {
          if (customListJob) {
            // Resolve the old one with something because no one else is going
            // to after it's replaced in a moment.
            customListJob.newQuery.resolve(customListJob.query);
            customListJob.newResults.resolve(null);
          }
          customListJob = connection._customListJob = {
            query: params.q,
            start: +params.start,
            newQuery: RSVP.defer(),
            newResults: RSVP.defer()
          };
          triggerEvent({
            type: 'searchForReplacement',
            query: customListJob.query,
            start: customListJob.start
          });
          return true;
        }
        return false;
      },
      requestChanger: function(connection, request) {
        return connection._customListJob.newQuery.promise.then(newQuery => {
          const newParams = _.clone(connection.params);
          newParams.q = newQuery;
          return {
            method: request.method,
            url: '?'+stringify(newParams),
            body: request.body
          };
        });
      },
      responseTextChanger: function(connection, response) {
        triggerEvent({
          type: 'searchResultsResponse',
          query: connection._customListJob.query,
          start: connection._customListJob.start,
          response
        });
        return connection._customListJob.newResults.promise.then(newResults =>
          newResults === null ? response : newResults
        );
      }
    });
  }
}

function triggerEvent(detail) {
  document.dispatchEvent(new CustomEvent('inboxSDKajaxIntercept', {
    bubbles: true, cancelable: false,
    detail
  }));
}

function stringifyComposeParams(inComposeParams){
  let composeParams = _.cloneDeep(inComposeParams);
  let string = `=${stringifyComposeRecipientParam(composeParams.to, 'to')}&=${stringifyComposeRecipientParam(composeParams.cc, 'cc')}&=${stringifyComposeRecipientParam(composeParams.bcc, 'bcc')}`;

  delete composeParams.to;
  delete composeParams.bcc;
  delete composeParams.cc;

  return string + "&" + querystring.stringify(composeParams);

}

function stringifyComposeRecipientParam(value, paramType){
  let string = "";

  if(Array.isArray(value)){
    for(let ii =0; ii<value.length; ii++){
      string += `&${paramType}=${encodeURIComponent(value[ii])}`;
    }
  }
  else{
    string += `&${paramType}=${encodeURIComponent(value)}`;
  }

  return string;
}
