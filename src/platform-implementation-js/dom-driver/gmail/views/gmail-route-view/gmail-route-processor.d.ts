import { ROUTE_TYPES } from '../../../../constants/router';

export default class GmailRouteProcessor {
  getCompatibleRouteID(routeID: string): string;
  isListRouteName(routeName: string): boolean;
  isNativeRoute(routeId: string): boolean;
  RouteTypes: typeof ROUTE_TYPES;
}
