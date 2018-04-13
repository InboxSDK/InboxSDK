/* @flow */

import clone from 'lodash/clone';
import flatten from 'lodash/flatten';
import find from 'lodash/find';
import intersection from 'lodash/intersection';
import BigNumber from 'bignumber.js';

import Kefir from 'kefir';
import * as logger from '../injected-logger';
import XHRProxyFactory from '../xhr-proxy-factory';
import querystring, {stringify} from 'querystring';
import * as threadIdentifier from './thread-identifier';
import * as messageMetadataHolder from '../message-metadata-holder';
import * as GmailResponseProcessor from '../../platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import * as GmailSyncResponseProcessor from '../../platform-implementation-js/dom-driver/gmail/gmail-sync-response-processor';
import quotedSplit from '../../common/quoted-split';
import defer from '../../common/defer';
import modifySuggestions from './modify-suggestions';

import {getDetailsOfComposeRequest, replaceEmailBodyForSendRequest} from './sync-compose-request-processor';

import type {XHRProxyConnectionDetails} from '../xhr-proxy-factory';

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

  threadIdentifier.setup();
  messageMetadataHolder.setup();

  //email sending modifier/notifier
  {
    let modifiers: {[key: string]: Array<string>} = {};

    Kefir.fromEvents(document, 'inboxSDKregisterComposeRequestModifier')
          .onValue(({detail}) => {
            const keyId = detail.composeid || detail.draftID;
            if(!modifiers[keyId]){
              modifiers[keyId] = [];
            }

            modifiers[keyId].push(detail.modifierId);
          });

    Kefir.fromEvents(document, 'inboxSDKunregisterComposeRequestModifier')
          .onValue(({detail}) => {
            const {keyId, modifierId} = detail;
            modifiers[keyId] = modifiers[keyId].filter(item => item !== modifierId);
            if (modifiers[keyId].length === 0) {
              delete modifiers[keyId];
            }
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
              body: composeParams.body,
              isPlainText: composeParams.ishtml !== '1'
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

          if (connection.originalSendBody) {
            const composeParams = querystring.parse(connection.originalSendBody);
            delete modifiers[composeParams.composeid];
          }
        }
      }
    });

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

    {
      // Sync API-based compose sending intercept
      const currentSendConnectionIDs: WeakMap<XHRProxyConnectionDetails, string> = new WeakMap();
      const currentDraftSaveConnectionIDs: WeakMap<XHRProxyConnectionDetails, string> = new WeakMap();
      const currentFirstDraftSaveConnectionIDs: WeakMap<XHRProxyConnectionDetails, string> = new WeakMap();
      main_wrappers.push({
        isRelevantTo(connection) {
          return /sync(?:\/u\/\d+)?\/i\/s/.test(connection.url);
        },
        originalSendBodyLogger(connection) {
          if (connection.originalSendBody) {
            const composeRequestDetails = getDetailsOfComposeRequest(connection.originalSendBody);
            if(!composeRequestDetails) return;

            const {draftID} = composeRequestDetails;

            switch(composeRequestDetails.type){
              case 'FIRST_DRAFT_SAVE':
                currentFirstDraftSaveConnectionIDs.set(connection, draftID);
              break;
              case 'DRAFT_SAVE':
                currentDraftSaveConnectionIDs.set(connection, draftID);
              break;
              case 'SEND':
                currentSendConnectionIDs.set(connection, draftID);
                triggerEvent({type: 'emailSending', draftID});
              break;
            }
          }
        },
        requestChanger: async function(connection, request) {
          const composeRequestDetails = getDetailsOfComposeRequest(request.body);
          if(!composeRequestDetails || composeRequestDetails.type !== 'SEND') return request;

          const {draftID, body, type} = composeRequestDetails;

          const composeModifierIds = modifiers[draftID];
          if(!composeModifierIds || composeModifierIds.length === 0) return request;

          let newEmailBody = composeRequestDetails.body;
          for(let ii=0; ii<composeModifierIds.length; ii++) {
            const modifierId = composeModifierIds[ii];

            const modificationPromise = Kefir.fromEvents(document, 'inboxSDKcomposeRequestModified')
                                              .filter(({detail}) => detail.draftID === draftID && detail.modifierId === modifierId)
                                              .take(1)
                                              .map(({detail}) => detail.composeParams)
                                              .toPromise(Promise);

            triggerEvent({
              type: 'inboxSDKmodifyComposeRequest',
              draftID,
              modifierId,
              composeParams: {
                body: newEmailBody,
                isPlainText: false
              }
            });


            const newComposeParams = await modificationPromise;
            newEmailBody = newComposeParams.body;
          }

          return Object.assign({}, request, {body: replaceEmailBodyForSendRequest(request.body, newEmailBody)});
        },
        afterListeners(connection) {
          if (
            currentSendConnectionIDs.has(connection) ||
            currentDraftSaveConnectionIDs.has(connection) ||
            currentFirstDraftSaveConnectionIDs.has(connection)
          ) {
            const sendFailed = () => {
              triggerEvent({type: 'emailSendFailed', draftID});
              currentSendConnectionIDs.delete(connection);
            };

            const draftID =
              currentSendConnectionIDs.get(connection) ||
              currentDraftSaveConnectionIDs.get(connection) ||
              currentFirstDraftSaveConnectionIDs.get(connection);

            if (connection.status !== 200 || !connection.originalResponseText) {
              sendFailed();
              return;
            }

            const originalResponse = JSON.parse(connection.originalResponseText);

            if(currentFirstDraftSaveConnectionIDs.has(connection)){
              const wrapper = (
                originalResponse[2] &&
                originalResponse[2][6] &&
                originalResponse[2][6][1] &&
                originalResponse[2][6][1][1]
              );

              if(wrapper){
                const saveUpdate = (
                  wrapper[3] &&
                  wrapper[3][1] &&
                  wrapper[3][1][1]
                );

                if(saveUpdate){
                  triggerEvent({
                    draftID: draftID,
                    type: 'emailDraftReceived',
                    rfcID: saveUpdate[14],
                    messageID: saveUpdate[1],
                    oldMessageID: new BigNumber(saveUpdate[48]).toString(16),
                    syncThreadID: wrapper[1]
                  });
                }
              }
            }
            else {
              const updateList = (
                originalResponse[2] &&
                originalResponse[2][6]
              );
              if (!updateList) {
                sendFailed();
                return;
              }

              const sendUpdateMatch = updateList.find((update) => (
                update[1] &&
                update[1][3] &&
                update[1][3][7] &&
                update[1][3][7][1] &&
                update[1][3][7][1][5] &&
                update[1][3][7][1][5][0] &&
                update[1][3][7][1][5][0][14]
              ));
              if (!sendUpdateMatch) {
                sendFailed();
                return;
              }

              const sendUpdateWrapper = (
                sendUpdateMatch[1] &&
                sendUpdateMatch[1][3] &&
                sendUpdateMatch[1][3][7] &&
                sendUpdateMatch[1][3][7][1]
              );

              const sendUpdate = sendUpdateWrapper[5][0];

              triggerEvent({
                draftID: draftID,
                type: currentSendConnectionIDs.has(connection) ? 'emailSent' : 'emailDraftReceived',
                rfcID: sendUpdate[14],
                messageID: sendUpdate[1],
                oldMessageID: new BigNumber(sendUpdate[48]).toString(16),
                threadID: sendUpdateWrapper[4],
                oldThreadID: new BigNumber(sendUpdateWrapper[18]).toString(16)
              });
            }

            currentSendConnectionIDs.delete(connection);
            currentDraftSaveConnectionIDs.delete(connection);
            currentFirstDraftSaveConnectionIDs.delete(connection);
          }
        }
      });
    }
  }


  // intercept and process thread responses
  {
    js_frame_wrappers.push({
      isRelevantTo(connection) {
        return !!connection.params.search && connection.params.view === 'tl';
      },
      async responseTextChanger(connection, responseText) {
        // Presence of a responseTextChanger blocks Gmail from getting the partial
        // values as this loads. We want our originalResponseTextLogger to run
        // before Gmail has seen any of the response.
        return responseText;
      },
      originalResponseTextLogger(connection) {
        if (connection.status === 200) {
          const search = connection.params.search;
          const responseText = connection.originalResponseText;

          threadIdentifier.processThreadListResponse(responseText);
        }
      }
    });
  }

  // intercept and process conversation view responses to get message metadata
  {
    // do this for gmail v1
    {
      js_frame_wrappers.push({
        isRelevantTo(connection) {
          return connection.params.view === 'cv';
        },

        originalResponseTextLogger(connection) {
          if(connection.status === 200) {
            const groupedMessages = GmailResponseProcessor.extractMessages(connection.originalResponseText);
            messageMetadataHolder.add(groupedMessages);
          }
        }
      });
    }

    // sync API based
    {
      // Sync API-based custom thread list interception
      main_wrappers.push({
        isRelevantTo: function(connection) {
          return /sync(?:\/u\/\d+)?\/i\/bv/.test(connection.url);
        },

        originalResponseTextLogger(connection) {
          if(connection.status === 200) {
            const threads = GmailSyncResponseProcessor.extractThreadsFromSearchResponse(connection.originalResponseText);
            messageMetadataHolder.add(
              threads.map((syncThread) => ({
                threadID: syncThread.syncThreadID,
                messages: syncThread.extraMetaData.syncMessageData.map(syncMessage => ({
                  date: syncMessage.date,
                  recipients: syncMessage.recipients
                }))
              }))
            );
          }
        }
      });

      // Sync API-based custom thread list interception
      main_wrappers.push({
        isRelevantTo: function(connection) {
          return /sync(?:\/u\/\d+)?\/i\/fd/.test(connection.url);
        },

        originalResponseTextLogger(connection) {
          if(connection.status === 200) {
            const threads = GmailSyncResponseProcessor.extractThreadsFromThreadResponse(connection.originalResponseText);
            messageMetadataHolder.add(
              threads.map((syncThread) => ({
                threadID: syncThread.syncThreadID,
                messages: syncThread.extraMetaData.syncMessageData.map(syncMessage => ({
                  date: syncMessage.date,
                  recipients: syncMessage.recipients
                }))
              }))
            );
          }
        }
      });
    }
  }

  // Search suggestions modifier
  // The content scripts tell us when they're interested in adding
  // modifications to future suggestion results. When we see a search
  // suggestions request come through, we signal the query string to the content
  // scripts, wait for the same number of responses as the number of registered
  // suggestion modifiers, and then meld them into the query response.
  {
    const providers = Object.create(null);
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
          currentQueryDefer.resolve(flatten(suggestionModifications));
          currentQueryDefer = currentQuery = suggestionModifications = null;
        }
      }
    });

    main_wrappers.push({
      isRelevantTo(connection) {
        return Object.keys(providers).length > 0 &&
          !!connection.url.match(/^\/cloudsearch\/request\?/) &&
          connection.params.client == 'gmail' &&
          connection.params.gs_ri == 'gmail';
      },
      originalSendBodyLogger(connection, body) {
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
        currentQueryDefer = (connection:any)._defer = defer();
        suggestionModifications = [];
        triggerEvent({
          type: 'suggestionsRequest',
          query: currentQuery
        });
      },
      async responseTextChanger(connection, responseText) {
        if ((connection:any)._defer && connection.status === 200) {
          const modifications = await (connection:any)._defer.promise;
          if (modifications) {
            return modifySuggestions(responseText, modifications);
          }
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

    // classic Gmail API intercept
    js_frame_wrappers.push({
      isRelevantTo: function(connection) {
        let customSearchTerm;
        const params = connection.params;
        if (
          connection.method === 'POST' &&
          params.search && params.view === 'tl' &&
          connection.url.match(/^\?/) &&
          params.q &&
          (customSearchTerm = intersection(customSearchTerms, quotedSplit(params.q))[0])
        ) {
          if (queryReplacement && queryReplacement.query === params.q && queryReplacement.start != params.start) {
            // If this is the same query that was made last, but just for a
            // different page, then re-use the replacement query we got last time.
            // Don't wait on the extension to come up with it again (and risk it
            // giving an inconsistent answer between pages).
            (connection:any)._queryReplacement = queryReplacement;
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
            queryReplacement = (connection:any)._queryReplacement = {
              term: customSearchTerm,
              query: params.q,
              start: params.start,
              newQuery: defer()
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
        return (connection:any)._queryReplacement.newQuery.promise.then(function(newQuery) {
          let newParams = clone(connection.params);
          newParams.q = newQuery;
          return {
            method: request.method,
            url: '?'+stringify(newParams),
            body: request.body
          };
        });
      }
    });

    // newer, sync API based request intercept
    main_wrappers.push({
      isRelevantTo: function(connection) {
        return (
          connection.method === 'POST' &&
          /sync(?:\/u\/\d+)?\/i\/bv/.test(connection.url)
        );
      },
      requestChanger: function(connection, request) {
        let customSearchTerm;
        const body = JSON.parse(request.body);
        const payload = body[1];
        const searchString = payload[4];
        const pageOffset = payload[10];

        const isSyncAPISearchWithCustomTerm = (
          payload[1] === 79 &&
          typeof searchString === 'string' &&
          (customSearchTerm = intersection(customSearchTerms, quotedSplit(searchString))[0])
        );
        if (!isSyncAPISearchWithCustomTerm) return Promise.resolve(request);

        if (queryReplacement && queryReplacement.query === searchString && queryReplacement.start != pageOffset) {
          // If this is the same query that was made last, but just for a
          // different page, then re-use the replacement query we got last time.
          // Don't wait on the extension to come up with it again (and risk it
          // giving an inconsistent answer between pages).
          (connection:any)._queryReplacement = queryReplacement;
          // Mark the old queryReplacement with this page now so we can tell on
          // a later request whether the page was changed or the list refresh
          // button was hit.
          queryReplacement.start = pageOffset;
        } else {
          if (queryReplacement) {
            // Resolve the old one with something because no one else is going
            // to after it's replaced in a moment.
            queryReplacement.newQuery.resolve(queryReplacement.query);
          }
          queryReplacement = (connection:any)._queryReplacement = {
            term: customSearchTerm,
            query: searchString,
            start: pageOffset,
            newQuery: defer()
          };

          triggerEvent({
            type: 'searchQueryForReplacement',
            term: customSearchTerm,
            query: searchString
          });
        }

        return (connection:any)._queryReplacement.newQuery.promise.then(function(newQuery) {
          body[1][4] = newQuery;
          return {
            method: request.method,
            url: request.url,
            body: JSON.stringify(body)
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
      if (
        customListJob.query === event.detail.query &&
        customListJob.start === event.detail.start
      ) {
        const {newQuery, newStart} = event.detail;

        customListJob.newRequestParams.resolve({
          query: newQuery,
          start: newStart
        });
      }
    });

    document.addEventListener('inboxSDKcustomListResults', (event: any) => {
      if (customListJob.query === event.detail.query) {
        customListJob.newResults.resolve(event.detail.newResults);
      }
    });

    {
      js_frame_wrappers.push({
        isRelevantTo: function(connection) {
          let customSearchQuery;
          const params = connection.params;
          if (
            connection.method === 'POST' &&
            params.search && params.view === 'tl' &&
            connection.url.match(/^\?/) &&
            params.q &&
            !params.act &&
            (customSearchQuery = find(customSearchQueries, x => x === params.q))
          ) {
            if (customListJob) {
              // Resolve the old one with something because no one else is going
              // to after it's replaced in a moment.
              customListJob.newRequestParams.resolve({
                query: customListJob.query,
                start: customListJob.start
              });
              customListJob.newResults.resolve(null);
            }
            customListJob = (connection:any)._customListJob = {
              query: params.q,
              start: +params.start,
              newRequestParams: defer(),
              newResults: defer()
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
          return (connection:any)._customListJob.newRequestParams.promise.then(({query, start}) => {
            const newParams = clone(connection.params);
            newParams.q = query;
            newParams.start = start;
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
            query: (connection:any)._customListJob.query,
            start: (connection:any)._customListJob.start,
            response
          });
          return (connection:any)._customListJob.newResults.promise.then(newResults =>
            newResults === null ? response : newResults
          );
        }
      });

      {
        // Sync API-based custom thread list interception
        main_wrappers.push({
          isRelevantTo: function(connection) {
            const params = connection.params;
            if (
              /sync(?:\/u\/\d+)?\/i\/bv/.test(connection.url)
            ) {
              if (customListJob) {
                // Resolve the old one with something because no one else is going
                // to after it's replaced in a moment.
                customListJob.newRequestParams.resolve({
                  query: customListJob.query,
                  start: customListJob.start
                });
                customListJob.newResults.resolve(null);
              }
              return true;
            }
            return false;
          },
          requestChanger: async function(connection, request) {
            if(request.body){
              const parsedBody = JSON.parse(request.body);

              // we are a search!
              const searchQuery = (
                parsedBody &&
                parsedBody[1] &&
                parsedBody[1][4]
              ) || '';

              if(find(customSearchQueries, x => x === searchQuery)) {
                customListJob = (connection:any)._customListJob = {
                  query: searchQuery,
                  start: parsedBody[1][10],
                  newRequestParams: defer(),
                  newResults: defer()
                };
                triggerEvent({
                  type: 'searchForReplacement',
                  query: customListJob.query,
                  start: customListJob.start
                });

                return (connection:any)._customListJob.newRequestParams.promise.then(({query, start}) => {
                  parsedBody[1][4] = query;
                  parsedBody[1][10] = start;

                  return {
                    method: request.method,
                    url: request.url,
                    body: JSON.stringify(parsedBody)
                  };
                });
              }
            }

            return request;
          },
          responseTextChanger: async function(connection, response) {
            if((connection:any)._customListJob){
              triggerEvent({
                type: 'searchResultsResponse',
                query: (connection:any)._customListJob.query,
                start: (connection:any)._customListJob.start,
                response
              });

              return (connection:any)._customListJob.newResults.promise.then(newResults =>
                newResults === null ? response : newResults
              );
            }
            else{
              return response;
            }
          }
        });
      }
    }
  }

  // sync token savers
  {
    const saveBTAIHeader = (header) => {
      (document.head:any).setAttribute('data-inboxsdk-btai-header', header);
      triggerEvent({type: 'btaiHeaderReceived'});
    };
    main_wrappers.push({
      isRelevantTo(connection) {
        return (
          /sync(?:\/u\/\d+)?\//.test(connection.url) &&
          !(document.head:any).hasAttribute('data-inboxsdk-btai-header')
        );
      },
      originalSendBodyLogger(connection) {
        if (connection.headers['X-Gmail-BTAI']) {
          saveBTAIHeader(connection.headers['X-Gmail-BTAI']);
        }
      }
    });

    const saveXsrfTokenHeader = (header) => {
      (document.head:any).setAttribute('data-inboxsdk-xsrf-token', header);
      triggerEvent({type: 'xsrfTokenHeaderReceived'});
    };
    main_wrappers.push({
      isRelevantTo(connection) {
        return (
          /sync(?:\/u\/\d+)?\//.test(connection.url) &&
          !(document.head:any).hasAttribute('data-inboxsdk-xsrf-token')
        );
      },
      originalSendBodyLogger(connection) {
        if(connection.headers['X-Framework-Xsrf-Token']) {
          saveXsrfTokenHeader(connection.headers['X-Framework-Xsrf-Token']);
        }
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
  const composeParams = clone(inComposeParams);
  const string = `=${stringifyComposeRecipientParam(composeParams.to, 'to')}&=${stringifyComposeRecipientParam(composeParams.cc, 'cc')}&=${stringifyComposeRecipientParam(composeParams.bcc, 'bcc')}`;

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
