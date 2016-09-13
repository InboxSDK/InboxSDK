/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import RSVP from 'rsvp';
import GmailElementGetter from '../gmail-element-getter';
import Logger from '../../../lib/logger';
import * as GRP from '../gmail-response-processor';
import type GmailDriver from '../gmail-driver';
import isStreakAppId from '../../../lib/is-streak-app-id';

const threadListHandlersToSearchStrings: Map<Function, string> = new Map();

/*
Timeline of how a custom thread list works:

* App registers a custom list by calling sdk.Router.handleCustomListRoute(),
  which forwards the call to the driver where the route id and handler are
  saved.

<User eventually navigates to a custom list route>

* setup-route-view-driver-stream.js receives the hashchange event, recognizes
  that it matched a registered custom list route id, and then calls this file's
  showCustomThreadList function instead of creating a RouteView.

* showCustomThreadList registers a bunch of listeners to respond at the right
  times in the coming storm.

* showCustomThreadList hides the text in the search box, so the nonsense search
  isn't visible to the user.

* showCustomThreadList sets it all in motion by navigating the user to a search
  for a random string.

<Gmail thinks the user has navigated to a search, and triggers an AJAX request
for the search>

* We intercept the search request before it goes out, call the handler function
  the app gave us to figure out the RFC message IDs the app wants to show, and
  then rewrite the search request to be a search for those specific messages.

* We let the request through, and then look up all of the gmail thread ids for
  the requested messages.

<The server sends the browser the AJAX response back>

* We intercept the response, and reorder the messages in the response into the
  order that the app wants.

<Gmail gets our rewritten AJAX response, and switches the DOM to the search
 results>

* When the search completes and Gmail switches to the search results,
  setup-route-view-driver-stream.js recognizes the search string in the URL,
  clears the search box, changes the hash in the URL to look like the custom
  list route id, and associates the new RouteView with the custom list.

*/

function findIdFailure(id, err) {
  console.log("Failed to find id for thread", id, err);
  return null;
}

// Returns the search string that will trigger the onActivate function.
function setupSearchReplacing(driver: GmailDriver, customRouteID: string, onActivate: Function): string {
  const preexistingQuery = threadListHandlersToSearchStrings.get(onActivate);
  if (preexistingQuery) {
    return preexistingQuery;
  }
  let start;
  const newQuery = Date.now()+'-'+Math.random();
  driver.getPageCommunicator().setupCustomListResultsQuery(newQuery);
  driver.getPageCommunicator().ajaxInterceptStream
    .filter(e =>
      e.type === 'searchForReplacement' &&
      e.query === newQuery
    )
    .flatMap(e => {
      start = e.start;
      driver.signalCustomThreadListActivity(customRouteID);
      try {
        return Kefir.fromPromise(RSVP.Promise.resolve(onActivate(e.start)));
      } catch(e) {
        return Kefir.constantError(e);
      }
    })
    .flatMap(ids =>
      Array.isArray(ids) ?
        Kefir.constant(ids) :
        Kefir.constantError(new Error("handleCustomListRoute result must be an array"))
    )
    .mapErrors(e => {
      driver.getLogger().error(e);
      return [];
    })
    .map(ids => _.map(ids, id => {
      if (typeof id === 'string') {
        if (id[0] == '<') {
          return {rfcId: id};
        } else {
          return {gtid: id};
        }
      } else if (id) {
        const obj = {
          gtid: typeof id.gmailThreadId === 'string' && id.gmailThreadId,
          rfcId: typeof id.rfcMessageId === 'string' && id.rfcMessageId
        };
        if (obj.gtid || obj.rfcId) {
          return obj;
        }
      }
    }))
    .map(_.compact)
    // Figure out any rfc ids we don't know yet
    .map((idPairs: Array<{rfcId: string}|{gtid: string}|{rfcId: string, gtid: string}>) =>
      RSVP.Promise.all(idPairs.map(pair => {
        if (pair.rfcId) {
          return pair;
        } else if (typeof pair.gtid === 'string') {
          const gtid = pair.gtid;
          return driver.getMessageIdManager().getRfcMessageIdForGmailThreadId(gtid)
            .then(rfcId => ({gtid, rfcId}), err => findIdFailure(gtid, err));
        }
      }))
    )
    .flatMap(Kefir.fromPromise)
    .map(_.compact)
    .onValue((idPairs: Array<{rfcId: string, gtid?: string}>) => {
      const query: string = idPairs.length > 0 ?
        idPairs.map(({rfcId}) => 'rfc822msgid:'+rfcId).join(' OR ')
        : ''+Math.random()+Date.now(); // google doesn't like empty searches
      driver.getPageCommunicator().setCustomListNewQuery(newQuery, query);
      Kefir.combine([
        // Figure out any gmail thread ids we don't know yet
        Kefir.fromPromise(RSVP.Promise.all(idPairs.map(pair =>
          pair.gtid ? pair :
          driver.getMessageIdManager().getGmailThreadIdForRfcMessageId(pair.rfcId)
            .then(gtid => ({gtid, rfcId: pair.rfcId}), err => findIdFailure(pair.rfcId, err))
        ))).map(_.compact),

        driver.getPageCommunicator().ajaxInterceptStream
          .filter(e =>
            e.type === 'searchResultsResponse' &&
            e.query === newQuery && e.start === start
          )
          .map(x => x.response)
          .take(1)
      ]).onValue(([idPairs, response]: [Array<{rfcId: string, gtid: string}>, string]) => {
        driver.signalCustomThreadListActivity(customRouteID);

        let newResponse;
        try {
          const extractedThreads = GRP.extractThreads(response);
          const newThreads: typeof extractedThreads = _.chain(idPairs)
            .map(({gtid}) => _.find(extractedThreads, t => t.gmailThreadId === gtid))
            .compact()
            .value();

          newResponse = GRP.replaceThreadsInResponse(response, newThreads);
          driver.getPageCommunicator().setCustomListResults(newQuery, newResponse);
        } catch(e) {
          driver.getLogger().error(e, {
            responseReplacementFailure: true,
            //response: isStreakAppId(driver.getAppId()) ? response : null,
            idPairsLength: idPairs.length
          });
          const butterBar = driver.getButterBar()
          if(butterBar){
            butterBar.showError({
              text: 'Failed to load custom thread list'
            });
          }
          try {
            driver.getPageCommunicator().setCustomListResults(
              newQuery, GRP.replaceThreadsInResponse(response, []));
          } catch(e2) {
            driver.getLogger().error(e2);
            // The original response will be used.
            driver.getPageCommunicator().setCustomListResults(newQuery, null);
          }
          return;
        }

        setTimeout(() => {
          const errorBar = document.querySelector('.vY .vX.UC');
          if (errorBar && errorBar.style.display !== 'none' && /#\d+/.test(errorBar.textContent)) {
            const isStreak = true||isStreakAppId(driver.getAppId());
            driver.getLogger().error(new Error('Gmail error with custom thread list'), {
              message: errorBar.textContent,
              idPairsLength: idPairs.length,
              response: isStreak ? response : null,
              newResponse: isStreak ? newResponse : null
            });
          }
        }, 1000);
      });
    });

  driver.getCustomListSearchStringsToRouteIds().set(newQuery, customRouteID);
  threadListHandlersToSearchStrings.set(onActivate, newQuery);
  return newQuery;
}

export default function showCustomThreadList(driver: GmailDriver, customRouteID: string, onActivate: Function) {
  const uniqueSearch = setupSearchReplacing(driver, customRouteID, onActivate);
  const customHash = document.location.hash;

  const nextMainContentElementChange = GmailElementGetter.getMainContentElementChangedStream().changes().take(1);

  const searchHash = '#search/'+encodeURIComponent(uniqueSearch);

  const searchInput = GmailElementGetter.getSearchInput();
  searchInput.value = '';
  searchInput.style.visibility = 'hidden';
  nextMainContentElementChange.onValue(() => {
    // setup-route-view-driver-stream handles clearing search again
    searchInput.style.visibility = 'visible';
  });

  window.history.replaceState(null, null, searchHash);
  const hce = new (window:any).HashChangeEvent('hashchange', {
    oldURL: document.location.href.replace(/#.*$/, '')+customHash,
    newURL: document.location.href.replace(/#.*$/, '')+searchHash
  });
  window.dispatchEvent(hce);
}
