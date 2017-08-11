/* @flow */

import type InboxDriver from './inbox-driver';
import populateRouteID from '../../lib/populateRouteID';
import type {RouteParams} from '../../namespaces/router';

export default function createLink(driver: InboxDriver, routeID: string, params: ?RouteParams): string {
  if (!driver.getCustomRouteIDs().has(routeID)) {
    throw new Error(`Invalid routeID: ${routeID}`);
  }
  return '#' + populateRouteID(routeID, params);
}
