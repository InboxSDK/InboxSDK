import qs from 'querystring';

import getSyncThreadsForSearch from '../../../driver-common/getSyncThreadsForSearch';
import { NATIVE_ROUTE_IDS } from '../../../constants/router';
import type { RouteParams } from '../../../namespaces/router';

import GmailDriver from '../gmail-driver';
import encodeDraftUrlId from './encodeDraftUrlId';
import getRfcMessageIdForGmailMessageId from './get-rfc-message-id-for-gmail-message-id';

export interface OpenDraftOptions {
  /**
   * Route to open the draft from. Gmail only parses `?compose=` on its own
   * routes, so a draft can not be opened while a custom route is showing.
   * Defaults to the current route when Gmail owns it, and to a native route
   * when it does not. Takes the same values as `Router.goto`.
   */
  routeID?: string;
  routeParams?: RouteParams | string | null;
}

/**
 * Gmail refuses to reopen a draft at a route the user previously browsed away
 * from with that draft still open, so every fallback navigation goes to a page
 * this session has not used yet. The page is far enough in that the list it
 * lands on is empty.
 */
let nextFallbackPage = 10000;

function getBaseHash(
  driver: GmailDriver,
  { routeID, routeParams }: OpenDraftOptions,
): string {
  if (routeID) {
    return driver.createLink(routeID, routeParams);
  }
  if (driver.isCurrentRouteCustom()) {
    return driver.createLink(NATIVE_ROUTE_IDS.STARRED, {
      page: nextFallbackPage++,
    });
  }
  return window.location.hash;
}

export default async function openDraftByMessageID(
  driver: GmailDriver,
  messageID: string,
  opts: OpenDraftOptions = {},
) {
  const rfcMessageID = await getRfcMessageIdForGmailMessageId(
    driver,
    messageID,
  );
  const { threads } = await getSyncThreadsForSearch(
    driver,
    'rfc822msgid:' + rfcMessageID,
  );

  if (threads.length === 0) {
    throw new Error('Failed to get sync message id');
  }

  const thread = threads[0];
  const syncMessageData = thread.extraMetaData.syncMessageData.find(
    (m) => m.oldMessageID === messageID,
  );
  if (!syncMessageData) {
    throw new Error('Failed to find syncMessageData');
  }

  const { syncMessageID } = syncMessageData;

  window.location.hash = makeNewSyncHash(
    getBaseHash(driver, opts),
    thread.syncThreadID,
    syncMessageID,
  );
}

export function makeNewHash(oldHash: string, messageID: string): string {
  oldHash = '#' + oldHash.replace(/^#/, '');
  const [pre, query] = oldHash.split('?');
  const params = qs.parse(query);
  if (params.compose) {
    params.compose += ',' + messageID;
  } else {
    params.compose = messageID;
  }
  return pre + '?' + qs.stringify(params);
}

export function makeNewSyncHash(
  oldHash: string,
  syncThreadID: string,
  syncMessageID: string,
): string {
  oldHash = '#' + oldHash.replace(/^#/, '');
  const [pre, query] = oldHash.split('?');
  const params = qs.parse(query);
  params.compose = encodeDraftUrlId(syncThreadID, syncMessageID);

  return pre + '?' + qs.stringify(params);
}
