import EventEmitter from '../../lib/safe-event-emitter';
import type { MinRouteViewDriver } from '../../driver-interfaces/route-view-driver';

/**
 * {@link RouteView}s represent pages within Gmail that a user can navigate to. RouteViews can be "custom", those that the application developer registers, or they can be "builtin" which are those that the email client natively supports like "Sent", "Drafts", or "Inbox"

 * This class mostly just gives you metadata about the route, most of the functionality to modify the route are defined in subclasses like ListRouteView and CustomRouteView, which you get by handling those types specifically in the Router.
 */
class RouteView extends EventEmitter {
  destroyed: boolean;
  #routeID: string | null = null;
  #routeType: string | null = null;
  #params: Record<string, string> | null = null;
  #routeViewDriver;

  constructor(routeViewDriver: MinRouteViewDriver) {
    super();
    this.destroyed = false;
    this.#routeViewDriver = routeViewDriver;

    _bindToEventStream(routeViewDriver, this);
  }

  /**
   * @returns a string or string[] of the ID of the RouteView. This is the same routeID that you give Router.goto() or Router.createLink(). This will be a value from NativeRouteIDs.
   */
  getRouteID(): string {
    if (!this.#routeID) {
      this.#routeID = this.#routeViewDriver.getRouteID();
    }

    return this.#routeID;
  }

  getRouteType(): string {
    if (!this.#routeType) {
      this.#routeType = this.#routeViewDriver.getRouteType();
    }

    return this.#routeType;
  }

  getParams(): Record<string, string> {
    if (!this.#params) {
      this.#params = this.#routeViewDriver.getParams();
    }

    return this.#params;
  }
}

function _bindToEventStream(
  routeViewDriver: MinRouteViewDriver,
  routeView: RouteView,
) {
  routeViewDriver.getEventStream().onEnd(() => {
    routeView.destroyed = true;
    routeView.emit('destroy');
    routeView.removeAllListeners();
  });
}

export default RouteView;
