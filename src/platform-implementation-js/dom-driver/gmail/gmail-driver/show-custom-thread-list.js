/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import RSVP from 'rsvp';
import GmailElementGetter from '../gmail-element-getter';
import Logger from '../../../lib/logger';
import * as GRP from '../gmail-response-processor';
import type GmailDriver from '../gmail-driver';
import isStreakAppId from '../../../lib/is-streak-app-id';

type ThreadDescriptor = string|{[id: 'gmailThreadId'|'rfcMessageId']: string};

type InitialIDPairs = Array<
  {rfcId: string}|
  {gtid: string}|
  {rfcId: string, gtid: string}
>;
type IDPairsWithRFC = Array<{rfcId: string, gtid?: string}>;
type CompletedIDPairs = Array<{rfcId: string, gtid: string}>;

type HandlerResult = {
  total?: number|'MANY',
  hasMore?: boolean,
  threads: Array<ThreadDescriptor>
};

type NormalizedHandlerResult = {
  total: number|'MANY',
  threads: Array<ThreadDescriptor>
};

const threadListHandlersToSearchStrings: Map<Function, string> = new Map();

const MAX_THREADS_PER_PAGE = 50;

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

const copyAndOmitExcessThreads = (ids: Array<ThreadDescriptor>): Array<ThreadDescriptor> => {
  if (ids.length > MAX_THREADS_PER_PAGE) {
    // upgrade to deprecationWarning later
    console.warn('Received more than MAX_THREADS_PER_PAGE threads, ignoring them');
  }
  return ids.slice(0, MAX_THREADS_PER_PAGE);
};

const findIdFailure = (id, err: Error) => {
  console.log("Failed to find id for thread", id, err);
  return null;
};

// Returns the search string that will trigger the onActivate function.
const setupSearchReplacing = (driver: GmailDriver, customRouteID: string, onActivate: Function): string => {
  const preexistingQuery = threadListHandlersToSearchStrings.get(onActivate);
  if (preexistingQuery) {
    return preexistingQuery;
  }
  let start: number;
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
        return Kefir.fromPromise(RSVP.Promise.resolve(onActivate(e.start, MAX_THREADS_PER_PAGE)));
      } catch(e) {
        return Kefir.constantError(e);
      }
    })
    .flatMap((handlerResult: HandlerResult|Array<ThreadDescriptor>) => {
      if (Array.isArray(handlerResult)) {
        // upgrade to deprecationWarning later.
        console.warn(`
          Returning an array from a handleCustomListRoute handler will not support
          pagination. Use an object instead (https://www.inboxsdk.com/docs/#Router).
        `);

        return Kefir.constant({
          // default to one page since arrays can't be paginated
          total: MAX_THREADS_PER_PAGE,
          threads: copyAndOmitExcessThreads(handlerResult)
        });
      } else if (typeof handlerResult === 'object') {
        const {total, hasMore, threads} = handlerResult;

        if (!Array.isArray(threads)) {
          return Kefir.constantError(new Error(`
            handleCustomListRoute result must contain a 'threads' array.
          `));
        }

        if (typeof total === 'number') {
          return Kefir.constant({
            total,
            threads: copyAndOmitExcessThreads(threads)
          });
        } else if (typeof hasMore === 'boolean') {
          return Kefir.constant({
            total: hasMore ? 'MANY' : start + Math.min(threads.length, MAX_THREADS_PER_PAGE),
            threads: copyAndOmitExcessThreads(threads)
          });
        } else {
          return Kefir.constantError(new Error(`
            handleCustomListRoute result must contain either a 'total' number
            or a 'hasMore' boolean (https://www.inboxsdk.com/docs/#Router).
          `));
        }
      } else {
        return Kefir.constantError(new Error(`
          handleCustomListRoute result must be an array or an object
        `));
      }
    })
    .mapErrors(e => {
      driver.getLogger().error(e);
      return [];
    })
    .map(({total, threads}: NormalizedHandlerResult) => ({
      total,
      idPairs: _.compact(threads.map(id => {
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
    }))
    // Figure out any rfc ids we don't know yet
    .map(({total, idPairs}: {total: number|'MANY', idPairs: InitialIDPairs}) => (
      RSVP.Promise.all(idPairs.map(pair => {
        if (pair.rfcId) {
          return pair;
        } else if (typeof pair.gtid === 'string') {
          const gtid = pair.gtid;
          return driver.getMessageIdManager().getRfcMessageIdForGmailThreadId(gtid)
            .then(rfcId => ({gtid, rfcId}), err => findIdFailure(gtid, err));
        }
      })).then((pairs: IDPairsWithRFC) => ({total, idPairs: _.compact(pairs)}))
    ))
    .flatMap(Kefir.fromPromise)
    .onValue(({total, idPairs}: {total: number|'MANY', idPairs: IDPairsWithRFC}) => {
      const query: string = idPairs.length > 0 ?
        idPairs.map(({rfcId}) => 'rfc822msgid:'+rfcId).join(' OR ')
        : ''+Math.random()+Date.now(); // google doesn't like empty searches

      // Outgoing requests for list queries always need to have a `start` of 0,
      // because we only ever ask for 1 page-worth of threads per query.
      // When the response comes back, we modify it to have a `start` consistent
      // with whatever page was being loaded so Gmail's UI makes sense.
      driver.getPageCommunicator().setCustomListNewQuery(newQuery, query, 0);
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
      ]).onValue(([idPairs, response]: [CompletedIDPairs, string]) => {
        driver.signalCustomThreadListActivity(customRouteID);

        let newResponse;
        try {
          const extractedThreads = GRP.extractThreads(response);
          const newThreads: typeof extractedThreads = _.chain(idPairs)
            .map(({gtid}) => _.find(extractedThreads, t => t.gmailThreadId === gtid))
            .compact()
            .value();

          newResponse = GRP.replaceThreadsInResponse(response, newThreads, {start, total});
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
              newQuery, GRP.replaceThreadsInResponse(response, [], {start, total}));
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

export default function showCustomThreadList(
  driver: GmailDriver,
  customRouteID: string,
  onActivate: Function,
  params: Array<string>
) {
  const uniqueSearch = setupSearchReplacing(driver, customRouteID, onActivate);
  const customHash = document.location.hash;

  const nextMainContentElementChange = GmailElementGetter.getMainContentElementChangedStream().changes().take(1);


  const searchInput = GmailElementGetter.getSearchInput();
  if (!searchInput) throw new Error('could not find search input');
  searchInput.value = '';
  searchInput.style.visibility = 'hidden';
  nextMainContentElementChange.onValue(() => {
    // setup-route-view-driver-stream handles clearing search again
    searchInput.style.visibility = 'visible';
  });

  // Change the hash *without* making a new history entry.
  const searchHash = '#search/' + [uniqueSearch, ...params].map(encodeURIComponent).join('/');
  window.history.replaceState(null, null, searchHash);
  // Create a hashchange event so setup-route-view-driver-stream sees this event.
  const hce = new (window:any).HashChangeEvent('hashchange', {
    oldURL: document.location.href.replace(/#.*$/, '')+customHash,
    newURL: document.location.href.replace(/#.*$/, '')+searchHash
  });
  window.dispatchEvent(hce);
}
