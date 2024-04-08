import find from 'lodash/find';
import intersection from 'lodash/intersection';
import HandlerRegistry from '../lib/handler-registry';
import RouteView from '../views/route-view/route-view';
import ListRouteView from '../views/route-view/list-route-view';
import CustomRouteView from '../views/route-view/custom-route-view';
import DummyRouteViewDriver from '../views/route-view/dummy-route-view-driver';
import type Membrane from '../lib/Membrane';
import {
  NATIVE_ROUTE_IDS,
  NATIVE_LIST_ROUTE_IDS,
  ROUTE_TYPES,
} from '../constants/router';
import type { Driver } from '../driver-interfaces/driver';
import type { Handler } from '../lib/handler-registry';
import { RouteViewDriver } from '../driver-interfaces/route-view-driver';

export type RouteParams = Record<string, string | number | undefined | null>;

const SAMPLE_RATE = 0.01;

/**
 * This namespace contains functionality associated with creating your own content inside Gmail. It allows you to define "Routes" which define a full page of content and an associated URL space for which they are active. You can think of routes as different pages in your application. Gmail already have a few routes built in (Inbox, Sent, Drafts, etc). This namespace allows you to define your own as well as listen in on the built in routes being navigated to.

This is typically used when you want to create content to fill the main content area of Gmail. Every route has a URL associated with it and can have optional parameters. However, you never construct these URL's manually. The SDK will take care of creating a URL that will work in Gmail for your Route. Since these URL's may change due to implementations of Gmail, you should always create new links when trying to set URL on elements or simply use the goto function which naviagtes to the created link automatically. Using the handleX family of methods, you can specify which routes your application can handle. You will be called back with and instance of a RouteView or similar when the user navigates to a route you've declared you can handle. For custom routes, you'll typically add your own content and for built in routes, you'll typically modify the existing content. Route ID's are path like strings with named parameters, for example: "myroute/:someParamMyRouteNeeds".
 */
class Router {
  NativeRouteIDs = NATIVE_ROUTE_IDS;
  NativeListRouteIDs = NATIVE_LIST_ROUTE_IDS;
  RouteTypes = ROUTE_TYPES;

  #appId: string;
  #driver: Driver;
  #currentRouteViewDriver: RouteViewDriver | DummyRouteViewDriver;
  #allRoutesHandlerRegistry: HandlerRegistry<RouteView>;
  #customRoutes: Array<{
    routeID: string | string[];
    onActivate: Handler<CustomRouteView>;
  }> = [];
  #membrane: Membrane;
  #listRouteHandlerRegistries: Record<string, HandlerRegistry<ListRouteView>> =
    {};

  constructor(appId: string, driver: Driver, membrane: Membrane) {
    this.#appId = appId;
    this.#driver = driver;
    this.#currentRouteViewDriver = new DummyRouteViewDriver();
    this.#allRoutesHandlerRegistry = new HandlerRegistry();
    this.#membrane = membrane;
    Object.values(NATIVE_LIST_ROUTE_IDS).forEach((value) => {
      this.#listRouteHandlerRegistries[value] = new HandlerRegistry();
    });

    driver.getRouteViewDriverStream().onValue((routeViewDriver) => {
      driver
        .getLogger()
        .trackFunctionPerformance(
          () => this.#handleRouteViewChange(routeViewDriver),
          SAMPLE_RATE,
          {
            type: 'handleRouteViewChange',
            routeID: routeViewDriver.getRouteID(),
          },
        );
    });
    driver.getStopper().onValue(() => {
      this.#allRoutesHandlerRegistry.dumpHandlers();
      Object.values(this.#listRouteHandlerRegistries).forEach((reg: any) => {
        reg.dumpHandlers();
      });
    });
  }

  /**
   * Get a URL that can be used to navigate to a view. You'll typically want to use this to set the href of an element or similar. Returns the encoded URL string.
   *
   * @param routeID A route specifying where the link should navigate the user to. This should either be a routeID registered with {@link Router#handleCustomRoute} or {@link Router#handleCustomListRoute}, or a value from {@link Router#NativeRouteIDs}.
   * @param params an object containing the parameters that will be encoded in the link and decoded when the user subsequently visits the route. Handlers for the specified routeID will receive a copy of this object. This object must contain only simple key value pairs with no nested arrays/objects.
   */
  createLink(
    routeID: string,
    params?: (RouteParams | null | undefined) | string,
  ): string {
    return this.#driver.createLink(routeID, params);
  }

  /**
   * Change the route to be the one with the given ID and have the given parameters.
   * @param routeID A route specifying where the link should navigate the user to. This should either be a routeID registered with {@link Router#handleCustomRoute} or {@link Router#handleCustomListRoute} a value from {@link Router#NativeRouteIDs}, or a value previously returned by {@link Router#createLink}. If it's a value previously returned by {@link Router#createLink} then the params argument must be omitted.
   * @param params an object containing the parameters that will be encoded in the link and decoded when the user subsequently visits the route. Handlers for the specified routeID will receive a copy of this object. This object must contain only simple key value pairs with no nested arrays/objects.
   */
  goto(
    routeID: string,
    params?: (RouteParams | null | undefined) | string,
  ): Promise<void> {
    if (typeof routeID !== 'string') {
      throw new Error('routeID must be a string');
    }

    const driver = this.#driver;

    if (typeof params === 'string') {
      driver
        .getLogger()
        .deprecationWarning(
          'Router.goto param string',
          'param object (e.g. {param: value})',
        );
    }

    return driver.goto(routeID, params);
  }

  /**
   * Registers a handler (callback) to be called when the user navigates to a custom route which matches the routeID you provide. Use this to create your own routes (pages) with your own custom content. Your callback will be passed an instance of a {@link CustomRouteView} whose contents you may modify.
   * @param routeID which route this handler is registering for
   * @param handler The callback to call when the route changes to a custom route matching the provided routeID
   * @returns a function which removes the handler registration.
   */
  handleCustomRoute(
    routeID: string,
    handler: Handler<CustomRouteView>,
  ): () => void {
    const customRouteDescriptor = {
      routeID: routeID,
      onActivate: handler,
    };
    const removeCustomRouteFromDriver = this.#driver.addCustomRouteID(routeID);
    const customRoutes = this.#customRoutes;
    const driver = this.#driver;
    customRoutes.push(customRouteDescriptor);
    driver.getLogger().eventSdkPassive('Router.handleCustomRoute');
    return function () {
      removeCustomRouteFromDriver();
      const index = customRoutes.indexOf(customRouteDescriptor);

      if (index > -1) {
        customRoutes.splice(index, 1);
      }
    };
  }

  /**
   * Registers a handler (callback) to be called when the user navigates to any route (both customs and built in routes). Because this can apply to any route, your callback will be given only a generic RouteView. This is typically used when you want to monitor for page changes but don't necessarily need to modify the page.
   * @param handler The callback to call when the route changes
   * @returns a function which removes the handler registration.
   */
  handleAllRoutes(handler: Handler<any>): () => void {
    return this.#allRoutesHandlerRegistry.registerHandler(handler);
  }

  /**
   * Registers a handler (callback) to be called when the user navigates to a list route which matches the routeID you provide. Gmail have several built in routes which are "Lists". These include routes like Inbox, All Mail, Sent, Drafts, etc. You'll typically use this to modify Gmail's built in List routes.
   * @param routeID which list route this handler is registering for.
   * @param handler The callback to call when the route changes to a list route matching the routeId.
   * @returns a function which removes the handler registration.
   *
   * @example
   *
   * ```javascript
   * sdk.Router.handleListRoute(sdk.Router.NativeRouteIDs.INBOX, (listRouteView) => {
   * ```
});
   */
  handleListRoute(
    routeID: string,
    handler: Handler<ListRouteView>,
  ): () => void {
    const listRouteHandlerRegistries = this.#listRouteHandlerRegistries;

    if (!listRouteHandlerRegistries[routeID]) {
      throw new Error('Invalid routeID specified');
    }

    return listRouteHandlerRegistries[routeID].registerHandler(handler);
  }

  /**
   * Used to create a custom view that shows a list of threads. When the user navigates to the given routeID, the handler function will be called. The handler function will be passed the starting offset (if the user sees 50 threads per page and is on page 2, then the offset will be 50), and a maximum number of threads to return. It must return a CustomListDescriptor, or a promise which resolves to one.
   * @param routeID  Which route this handler is registering for.
   * @param handler Passed a page offset and a maximum number of threads to return. Must return a CustomListDescriptor, or a promise which resolves to one.
   * @returns a function which removes the handler registration.
   */
  handleCustomListRoute(
    routeID: string,
    handler: (...args: Array<any>) => any,
  ): () => void {
    return this.#driver.addCustomListRouteID(routeID, handler);
  }

  /**
   * @returns a RouteView of the current route view
   */
  getCurrentRouteView(): RouteView {
    return this.#membrane.get(this.#currentRouteViewDriver);
  }

  #handleRouteViewChange(routeViewDriver: RouteViewDriver) {
    if (this.#currentRouteViewDriver instanceof DummyRouteViewDriver) {
      this.#currentRouteViewDriver.destroy();
    }

    this.#currentRouteViewDriver = routeViewDriver;
    const routeView = this.#membrane.get(routeViewDriver);

    this.#updateNavMenu(routeViewDriver);

    if (routeView.getRouteType() === ROUTE_TYPES.CUSTOM) {
      this.#informRelevantCustomRoutes(routeViewDriver, routeView);
    }

    this.#allRoutesHandlerRegistry.addTarget(routeView);

    if (routeView.getRouteType() === ROUTE_TYPES.LIST) {
      const listRouteView = new ListRouteView(
        routeViewDriver,
        this.#driver,
        this.#appId,
      );
      const listRouteHandlerRegistry =
        this.#listRouteHandlerRegistries[routeView.getRouteID()];

      if (listRouteHandlerRegistry) {
        listRouteHandlerRegistry.addTarget(listRouteView);
      }

      this.#listRouteHandlerRegistries[NATIVE_ROUTE_IDS.ANY_LIST].addTarget(
        listRouteView,
      );
    }
  }

  #informRelevantCustomRoutes(
    routeViewDriver: RouteViewDriver,
    routeView: RouteView,
  ) {
    const routeID = routeView.getRouteID();
    const routeIDArray = Array.isArray(routeID) ? routeID : [routeID];
    const relevantCustomRoute = find(
      this.#customRoutes,
      (customRoute) =>
        intersection(
          Array.isArray(customRoute.routeID)
            ? customRoute.routeID
            : [customRoute.routeID],
          routeIDArray,
        ).length,
    );

    if (relevantCustomRoute) {
      const customRouteView = new CustomRouteView(routeViewDriver);
      const customViewElement = routeViewDriver.getCustomViewElement();
      if (!customViewElement) throw new Error('should not happen');
      this.#driver.showCustomRouteView(customViewElement);

      try {
        (relevantCustomRoute as any).onActivate(customRouteView);
      } catch (err) {
        this.#driver.getLogger().error(err);
      }
    }
  }

  #updateNavMenu(newRouteViewDriver: RouteViewDriver) {
    this.#driver.setShowNativeNavMarker(
      newRouteViewDriver.getType() !== ROUTE_TYPES.CUSTOM,
    );
    this.#driver.setShowNativeAddonSidebar(
      newRouteViewDriver.getType() !== ROUTE_TYPES.CUSTOM,
    );
  }
}

export default Router;
