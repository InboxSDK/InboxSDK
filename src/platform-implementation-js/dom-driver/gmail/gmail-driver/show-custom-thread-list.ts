import find from 'lodash/find';
import uniqBy from 'lodash/uniqBy';
import Kefir from 'kefir';
import GmailElementGetter from '../gmail-element-getter';
import * as SyncGRP from '../gmail-sync-response-processor';
import type Logger from '../../../lib/logger';
import type GmailDriver from '../gmail-driver';
import isStreakAppId from '../../../lib/isStreakAppId';
import update from 'immutability-helper';
import isNotNil from '../../../../common/isNotNil';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';

type ThreadDescriptor =
  | string
  | {
      gmailThreadId?: string | null | undefined;
      rfcMessageId?: string | null | undefined;
    };

type InitialIDPair =
  | { rfcId: string }
  | { gtid: string }
  | { rfcId: string; gtid: string };
type IDPairWithRFC = { rfcId: string; gtid?: string };
type CompletedIDPair = { rfcId: string; gtid: string };

type HandlerResult = {
  total?: number;
  hasMore?: boolean;
  threads: Array<ThreadDescriptor>;
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

function copyAndOmitExcessThreads(
  ids: Array<ThreadDescriptor>,
  logger: Logger,
): Array<ThreadDescriptor> {
  if (ids.length > MAX_THREADS_PER_PAGE) {
    // upgrade to deprecationWarning later
    logger.error(
      new Error(
        'Received more than the maximum number of threads specified by handler, ' +
          'ignoring additional threads (https://www.inboxsdk.com/docs/#Router).',
      ),
    );
  }
  return ids.slice(0, MAX_THREADS_PER_PAGE);
}

function _findIdFailure(id: string, err: Error) {
  console.log('Failed to find id for thread', id, err);
  return null;
}

function parseOnActivateResult(
  logger: Logger,
  start: number,
  result: HandlerResult | Array<ThreadDescriptor>,
): { total: number | 'MANY'; threads: ThreadDescriptor[] } {
  if (Array.isArray(result)) {
    logger.deprecationWarning(
      'Returning an array from a handleCustomListRoute handler',
      'a CustomListDescriptor object',
    );
    const threads = copyAndOmitExcessThreads(result, logger);
    return {
      // default to one page since arrays can't be paginated
      total: threads.length,
      threads,
    };
  } else if (typeof result === 'object') {
    const { total, hasMore, threads } = result;

    if (!Array.isArray(threads)) {
      throw new Error(
        'handleCustomListRoute result must contain a "threads" array ' +
          '(https://www.inboxsdk.com/docs/#Router).',
      );
    }

    if (total != null && hasMore != null) {
      throw new Error(
        'handleCustomListRoute result must only contain either ' +
          'a "total" or a "hasMore" property, but not both. ' +
          '(https://www.inboxsdk.com/docs/#Router).',
      );
    }

    if (typeof total === 'number') {
      return {
        total,
        threads: copyAndOmitExcessThreads(threads, logger),
      };
    } else if (typeof hasMore === 'boolean') {
      const threadsWithoutExcess = copyAndOmitExcessThreads(threads, logger);
      return {
        total: hasMore ? 'MANY' : start + threads.length,
        threads: threadsWithoutExcess,
      };
    } else {
      throw new Error(
        'handleCustomListRoute result must contain either a "total" number ' +
          'or a "hasMore" boolean (https://www.inboxsdk.com/docs/#Router).',
      );
    }
  } else {
    throw new Error(
      'handleCustomListRoute result must be an array or an object ' +
        '(https://www.inboxsdk.com/docs/#Router).',
    );
  }
}

function threadDescriptorToInitialIDPair(
  id: ThreadDescriptor,
): InitialIDPair | null | undefined {
  if (typeof id === 'string') {
    if (id[0] == '<') {
      return { rfcId: id };
    } else {
      return { gtid: id };
    }
  } else if (id) {
    const obj = {
      gtid: typeof id.gmailThreadId === 'string' && id.gmailThreadId,
      rfcId: typeof id.rfcMessageId === 'string' && id.rfcMessageId,
    };
    if (obj.gtid || obj.rfcId) {
      return obj as any;
    }
  }
}

type FindIdFailure = any;

function initialIDPairToIDPairWithRFC(
  driver: GmailDriver,
  pair: InitialIDPair,
  findIdFailure: FindIdFailure,
): Promise<IDPairWithRFC | null | undefined> {
  if (typeof (pair as any).rfcId === 'string') {
    return Promise.resolve(pair as IDPairWithRFC);
  } else if (typeof (pair as any).gtid === 'string') {
    const gtid = (pair as any).gtid;
    return driver.getRfcMessageIdForGmailThreadId(gtid).then(
      (rfcId) => ({ gtid, rfcId }),
      (err) => findIdFailure(gtid, err),
    );
  }
  throw new Error('Should not happen');
}

function idPairWithRFCToCompletedIDPair(
  driver: GmailDriver,
  pair: IDPairWithRFC,
  findIdFailure: FindIdFailure,
): Promise<CompletedIDPair | null | undefined> {
  return typeof pair.gtid === 'string'
    ? Promise.resolve(pair as CompletedIDPair)
    : driver.getGmailThreadIdForRfcMessageId(pair.rfcId).then(
        (gtid) => ({ gtid, rfcId: pair.rfcId }),
        (err) => findIdFailure(pair.rfcId, err),
      );
}

// Returns the search string that will trigger the onActivate function.
const setupSearchReplacing = (
  driver: GmailDriver,
  customRouteID: string,
  onActivate: Function,
  findIdFailure: FindIdFailure,
): string => {
  const preexistingQuery = threadListHandlersToSearchStrings.get(onActivate);
  if (preexistingQuery) {
    return preexistingQuery;
  }
  const newQuery = Date.now() + '-' + Math.random();
  driver.getPageCommunicator().setupCustomListResultsQuery(newQuery);
  driver
    .getPageCommunicator()
    .ajaxInterceptStream.filter(
      (e) => e.type === 'searchForReplacement' && e.query === newQuery,
    )
    .onValue(({ start }: { start: number }) => {
      (async () => {
        driver.signalCustomThreadListActivity(customRouteID);

        let total: number | 'MANY';
        let threadDescriptors: ThreadDescriptor[];
        try {
          const onActivateResult: HandlerResult | Array<ThreadDescriptor> =
            await Promise.resolve(onActivate(start, MAX_THREADS_PER_PAGE));
          const parsed = parseOnActivateResult(
            driver.getLogger(),
            start,
            onActivateResult,
          );
          total = parsed.total;
          threadDescriptors = parsed.threads;
        } catch (e) {
          driver.getLogger().error(e);
          total = 0;
          threadDescriptors = [];
        }

        const initialIDPairs: InitialIDPair[] = threadDescriptors
          .map(threadDescriptorToInitialIDPair)
          .filter(isNotNil);

        const idPairsWithRFC: IDPairWithRFC[] = (
          await Promise.all(
            initialIDPairs.map((pair) =>
              initialIDPairToIDPairWithRFC(driver, pair, findIdFailure),
            ),
          )
        ).filter(isNotNil);

        const messageIDQuery: string =
          idPairsWithRFC.length > 0
            ? idPairsWithRFC
                .map(({ rfcId }) => 'rfc822msgid:' + rfcId)
                .join(' OR ')
            : '' + Math.random() + Date.now(); // google doesn't like empty searches

        // Outgoing requests for list queries always need to have a `start` of 0,
        // because we only ever ask for 1 page-worth of threads per query.
        // When the response comes back, we modify it to have a `start` consistent
        // with whatever page was being loaded so Gmail's UI makes sense.
        driver.getPageCommunicator().setCustomListNewQuery({
          newQuery: messageIDQuery,
          newStart: 0,
          query: newQuery,
          start,
        });

        const searchResultsResponse_promise = driver
          .getPageCommunicator()
          .ajaxInterceptStream.filter(
            (e) =>
              e.type === 'searchResultsResponse' &&
              e.query === newQuery &&
              e.start === start,
          )
          .map((x) => x.response)
          .take(1)
          .toPromise();

        // Figure out any gmail thread ids we don't know yet.
        // Use uniqBy to remove duplicates which cause issues with Gmail sometimes
        // https://github.com/InboxSDK/InboxSDK/issues/1130
        const completedIDPairs: Array<CompletedIDPair> = uniqBy(
          (
            await Promise.all(
              idPairsWithRFC.map((pair) =>
                idPairWithRFCToCompletedIDPair(driver, pair, findIdFailure),
              ),
            )
          ).filter(isNotNil),
          (p) => p.gtid,
        );

        const response = await searchResultsResponse_promise;

        driver.signalCustomThreadListActivity(customRouteID);

        // override thread list response so that we show results in the same
        // order that user passed in
        let newResponse: any;
        try {
          const extractedThreads =
            SyncGRP.extractThreadsFromSearchResponse(response);

          const extractedThreadsInCompletedIDPairsOrder = completedIDPairs
            .map(({ gtid }) =>
              find(extractedThreads, (t) => t.oldGmailThreadID === gtid),
            )
            .filter(isNotNil);

          const doesNeedReorder =
            extractedThreads.length !==
              extractedThreadsInCompletedIDPairsOrder.length ||
            extractedThreads.some(
              (extractedThread, index) =>
                extractedThread !==
                extractedThreadsInCompletedIDPairsOrder[index],
            );

          let reorderedThreads: typeof extractedThreads;
          if (doesNeedReorder) {
            const now = Date.now();
            reorderedThreads = extractedThreadsInCompletedIDPairsOrder.map(
              (extractedThread, index) => {
                const newFormat = Array.isArray(extractedThread.rawResponse);

                const newTime = String(now - index);
                let newThread = update(extractedThread, {
                  rawResponse: newFormat
                    ? {
                        '0': {
                          '2': { $set: newTime },
                          '7': { $set: newTime },
                        },
                      }
                    : {
                        '1': {
                          '3': { $set: newTime },
                          '8': { $set: newTime },
                        },
                      },
                });

                if (
                  newFormat
                    ? extractedThread.rawResponse[0][4]
                    : extractedThread.rawResponse[1][5]
                ) {
                  newThread = update(newThread, {
                    rawResponse: newFormat
                      ? {
                          '0': {
                            '4': (oldVal: any[]) =>
                              oldVal.map((md) =>
                                update(md, {
                                  '6': { $set: newTime },
                                  '17': { $set: newTime },
                                  '30': { $set: newTime },
                                }),
                              ),
                          },
                        }
                      : {
                          '1': {
                            '5': (oldVal: any[]) =>
                              oldVal.map((md) =>
                                update(md, {
                                  '7': { $set: newTime },
                                  '18': { $set: newTime },
                                  '31': { $set: newTime },
                                }),
                              ),
                          },
                        },
                  });
                }
                return newThread;
              },
            );
          } else {
            reorderedThreads = extractedThreads;
          }

          newResponse = SyncGRP.replaceThreadsInSearchResponse(
            response,
            reorderedThreads,
            { start, total },
          );

          driver
            .getPageCommunicator()
            .setCustomListResults(newQuery, newResponse);
        } catch (e) {
          driver.getLogger().error(e, {
            responseReplacementFailure: true,
            //response: isStreakAppId(driver.getAppId()) ? response : null,
            idPairsLength: completedIDPairs.length,
          });
          const butterBar = driver.getButterBar();
          if (butterBar) {
            butterBar.showError({
              text: 'Failed to load custom thread list',
            });
          }
          try {
            driver.getPageCommunicator().setCustomListResults(
              newQuery,
              SyncGRP.replaceThreadsInSearchResponse(response, [], {
                start,
                total,
              }),
            );
          } catch (e2) {
            driver.getLogger().error(e2);
            // The original response will be used.
            driver.getPageCommunicator().setCustomListResults(newQuery, null);
          }
          return;
        }

        setTimeout(() => {
          const errorBar = document.querySelector<HTMLElement>('.vY .vX.UC');
          if (
            errorBar &&
            errorBar.style.display !== 'none' &&
            /#\d+/.test(errorBar.textContent!)
          ) {
            const isStreak = isStreakAppId(driver.getAppId());
            driver
              .getLogger()
              .error(new Error('Gmail error with custom thread list'), {
                message: errorBar.textContent,
                completedIDPairsLength: completedIDPairs.length,
                response: isStreak ? response : null,
                newResponse: isStreak ? newResponse : null,
              });
          }
        }, 1000);
      })().catch((err) => driver.getLogger().error(err));
    });

  driver.getCustomListSearchStringsToRouteIds().set(newQuery, customRouteID);
  threadListHandlersToSearchStrings.set(onActivate, newQuery);
  return newQuery;
};

export default function showCustomThreadList(
  driver: GmailDriver,
  customRouteID: string,
  onActivate: Function,
  params: Array<string>,
  findIdFailure: typeof _findIdFailure = _findIdFailure,
) {
  const uniqueSearch = setupSearchReplacing(
    driver,
    customRouteID,
    onActivate,
    findIdFailure,
  );
  const customHash = document.location.hash;

  const searchInput = GmailElementGetter.getSearchInput();
  if (!searchInput) throw new Error('could not find search input');

  const inputStream = GmailElementGetter.getMainContentElementChangedStream()
    .changes()
    .take(1)
    .map(() => searchInput)
    .flatMapLatest((input: HTMLElement) =>
      makeMutationObserverChunkedStream(input, {
        attributes: true,
        attributeOldValue: true,
      })
        .filter((mutationRecords: MutationRecord[]) => {
          // These are sort of arbitrary, they just occur after input.value has been written on the inputSearbox
          return mutationRecords.some(
            (mutationRecord) =>
              mutationRecord.attributeName === 'role' &&
              mutationRecord.oldValue === 'combobox',
          );
        })
        // timeout fallback in case we never observe the above mutation
        .merge(Kefir.later(15_000, null))
        .take(1),
    );

  inputStream.onValue(() => {
    searchInput.value = '';
    searchInput.style.visibility = 'visible';
  });

  searchInput.style.visibility = 'hidden';

  // Change the hash *without* making a new history entry.
  const searchHash =
    '#search/' + [uniqueSearch, ...params].map(encodeURIComponent).join('/');
  window.history.replaceState(null, null!, searchHash);
  // Create a hashchange event so setup-route-view-driver-stream sees this event.
  const hce = new window.HashChangeEvent('hashchange', {
    oldURL: document.location.href.replace(/#.*$/, '') + customHash,
    newURL: document.location.href.replace(/#.*$/, '') + searchHash,
  });
  window.dispatchEvent(hce);
}
