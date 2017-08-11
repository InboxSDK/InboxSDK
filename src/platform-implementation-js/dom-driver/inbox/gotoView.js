/* @flow */

import type InboxDriver from './inbox-driver';
import populateRouteID from '../../lib/populateRouteID';
import type {RouteParams} from '../../namespaces/router';
import routeIDmatchesHash from '../../lib/routeIDmatchesHash';

export default function gotoView(driver: InboxDriver, routeID: string, params: ?RouteParams): void {
  if (!driver.getCustomRouteIDs().has(routeID)) {
    const startedWithHash = routeID[0] === '#';
    if (startedWithHash) {
      routeID = routeID.slice(1);
    }
    let foundRouteID = false;
    if (!params) { // If params were given, then we don't assume it was a resolved/populated URL
      for (let routeIDs of driver.getCustomRouteIDs()) {
        if (routeIDmatchesHash(routeIDs, routeID)) {
          foundRouteID = true;
          break;
        }
      }
    }
    if (!foundRouteID) {
      throw new Error(`Invalid routeID: ${routeID}`);
    }
    if (!startedWithHash) {
      driver.getLogger().deprecationWarning('Router.goto resolved routeID without "#" prefix');
    }
  }
  document.location.hash = populateRouteID(routeID, params);
}
