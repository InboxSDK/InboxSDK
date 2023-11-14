import Kefir, { Observable } from 'kefir';
import get from '../../../../common/get-or-fail';

import type GmailDriver from '../gmail-driver';
import type GmailRouteProcessor from '../views/gmail-route-view/gmail-route-processor';
import GmailElementGetter from '../gmail-element-getter';
import GmailRouteView from '../views/gmail-route-view/gmail-route-view';
import getURLObject from './get-url-object';

import routeIDmatchesHash from '../../../lib/routeIDmatchesHash';

export default function setupRouteViewDriverStream(
  gmailRouteProcessor: GmailRouteProcessor,
  driver: GmailDriver,
): Observable<GmailRouteView, unknown> {
  const customRouteIDs = driver.getCustomRouteIDs();
  const customListRouteIDs = driver.getCustomListRouteIDs();
  const customListSearchStringsToRouteIds =
    driver.getCustomListSearchStringsToRouteIds();

  let lastNativeHash = getURLObject(document.location.href).hash;
  let latestGmailRouteView: GmailRouteView | null = null;

  driver.getStopper().onValue(() => {
    if (latestGmailRouteView) {
      latestGmailRouteView.destroy();
    }
  });

  let lastHash = lastNativeHash;

  let sameRouteData: Record<string, any> = {};

  const eligibleHashChanges = Kefir.fromEvents<HashChangeEvent, unknown>(
    window,
    'hashchange',
  )
    .filter((event) => !event.oldURL.match(/#inboxsdk-fake-no-vc$/))
    .map((event) => ({
      new: getURLObject(event.newURL),
      old: getURLObject(event.oldURL),
    }))
    .filter((event) => event.new.hash !== event.old.hash)
    .map((event) => event.new)
    .map((urlObject) => {
      const { hash, name } = urlObject;
      for (const routeIDs of customRouteIDs) {
        const routeID = routeIDmatchesHash(routeIDs, hash);
        if (routeID) {
          return { urlObject, type: 'CUSTOM', routeID };
        }
      }
      for (const [routeIDs] of customListRouteIDs) {
        const routeID = routeIDmatchesHash(routeIDs, name);
        if (routeID) {
          return { urlObject, type: 'CUSTOM_LIST_TRIGGER', routeID };
        }
      }
      if (gmailRouteProcessor.isNativeRoute(urlObject.name)) {
        return { urlObject, type: 'NATIVE' };
      }
      return { urlObject, type: 'OTHER_APP_CUSTOM' };
    });

  const customAndCustomListRouteHashChanges = eligibleHashChanges.filter(
    ({ type }) => type !== 'NATIVE',
  );

  // If a user goes from a native route to a custom route, and then back to the
  // same native route, we need to make a new GmailRouteView because
  // getMainContentElementChangedStream() won't be firing, except when going from thread->custom->thread
  const revertNativeHashChanges = eligibleHashChanges
    .filter(({ type }) => type === 'NATIVE')
    .filter(({ urlObject }) => {
      const tmp = lastNativeHash;
      lastNativeHash = urlObject.hash;
      return tmp === urlObject.hash;
    })
    .filter(({ urlObject }) => {
      return urlObject.hash !== lastHash;
    });

  // Merge everything that can trigger a new RouteView
  return Kefir.merge([
    customAndCustomListRouteHashChanges,
    revertNativeHashChanges,

    // when native gmail changes main view there's a div that takes on role=main.
    // getMainContentElementChangedStream doesn't respect custom views so filter
    // out events from it. This filter is needed if the user is already at a custom
    // view of another InboxSDK instance while this starts up.
    GmailElementGetter.getMainContentElementChangedStream()
      .map((_event) => ({
        urlObject: getURLObject(document.location.href),
        type: 'NATIVE',
      }))
      .filter((options) =>
        gmailRouteProcessor.isNativeRoute(options.urlObject.name),
      ),
  ])
    .map((options) => {
      const { type, urlObject } = options;
      if (type === 'NATIVE' && urlObject.name === 'search') {
        const customListRouteId = customListSearchStringsToRouteIds.get(
          urlObject.params[0],
        );
        if (customListRouteId) {
          const searchInput = GmailElementGetter.getSearchInput();
          if (!searchInput) throw new Error('Should not happen');
          searchInput.value = '';

          // Only rewrite the url if it's a search query with no further
          // parameters or it has a page parameter. Don't write URLs with thread
          // id parameters because currently other parts of the code depend on
          // being able to parse the URL as a normal thread URL.

          // Additionally, we don't want to treat threads as the CUSTOM_LIST type
          // since they're not lists.
          if (
            urlObject.params.length === 1 ||
            (urlObject.params.length === 2 && urlObject.params[1][0] === 'p')
          ) {
            driver.hashChangeNoViewChange(
              '#' +
                customListRouteId +
                (urlObject.params[1] ? '/' + urlObject.params[1] : ''),
            );
            return {
              type: 'CUSTOM_LIST',
              urlObject,
              routeID: customListRouteId,
            };
          }
        }
      }
      return options;
    })
    .map((options) => {
      const MAX_KEY_CACHE = 50;
      const { urlObject } = options;

      if (!sameRouteData[urlObject.hash]) {
        sameRouteData[urlObject.hash] = {
          data: {},
        };
      }
      sameRouteData[urlObject.hash].lastUsedTimestamp = Date.now();

      if (Object.keys(sameRouteData).length > MAX_KEY_CACHE) {
        sameRouteData = Object.keys(sameRouteData)
          .sort(
            (a, b) =>
              sameRouteData[b].lastUsedTimestamp -
              sameRouteData[a].lastUsedTimestamp,
          )
          .slice(0, MAX_KEY_CACHE / 2)
          .reduce((acc, hash) => ({ ...acc, [hash]: sameRouteData[hash] }), {});
      }

      return {
        ...options,
        cachedRouteData: sameRouteData[urlObject.hash].data,
      };
    })
    .map((options) => {
      if (options.type === 'NATIVE' || options.type === 'CUSTOM_LIST') {
        driver.showNativeRouteView();
      } else if (options.type === 'CUSTOM_LIST_TRIGGER') {
        driver.showCustomThreadList(
          (options as any).routeID,
          get(customListRouteIDs, (options as any).routeID),
          options.urlObject.params,
        );
        return;
      }
      return new GmailRouteView(options, gmailRouteProcessor, driver);
    })
    .filter(Boolean)
    .map((gmailRouteView) => {
      if (latestGmailRouteView) {
        latestGmailRouteView.destroy();
      }
      latestGmailRouteView = gmailRouteView!;
      lastHash = getURLObject(document.location.href).hash;

      return gmailRouteView!;
    });
}

/*
 * TODO: Split up "role=main" DOM watching and hash change watching.
 *
 * SDK only cares about hash change when the hash goes to a route that the app registered as custom.
 * Otherwise it only responds to route changes when the role=main div changes.
 */
