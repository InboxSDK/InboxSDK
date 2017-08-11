/* @flow */

import includes from 'lodash/includes';
import type InboxDriver from './inbox-driver';
import populateRouteID from '../../lib/populateRouteID';
import type {RouteParams} from '../../namespaces/router';
import {NATIVE_ROUTE_IDS} from '../../constants/router';

export default function createLink(driver: InboxDriver, routeID: string, params: ?RouteParams): string {
  if (includes(Object.values(NATIVE_ROUTE_IDS), routeID)) {
    throw new Error('NativeRouteIDs are not currently supported in Inbox');
  }
  if (!driver.getCustomRouteIDs().has(routeID)) {
    throw new Error(`Invalid routeID: ${routeID}`);
  }
  return '#' + populateRouteID(routeID, params);
}
