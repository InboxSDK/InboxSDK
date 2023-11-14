import EventEmitter from '../../lib/safe-event-emitter';
import get from '../../../common/get-or-fail';
import type { MinRouteViewDriver } from '../../driver-interfaces/route-view-driver';
const membersMap = new WeakMap(); // documented in src/docs/

class RouteView extends EventEmitter {
  destroyed: boolean;

  constructor(routeViewDriver: MinRouteViewDriver) {
    super();
    const members = {
      routeID: null as string | null | undefined,
      routeType: null as string | null | undefined,
      params: null as Record<string, string> | null | undefined,
      routeViewDriver,
    };
    membersMap.set(this, members);
    this.destroyed = false;

    _bindToEventStream(routeViewDriver, this);
  }

  getRouteID(): string {
    const members = get(membersMap, this);

    if (!members.routeID) {
      members.routeID = members.routeViewDriver.getRouteID();
    }

    return members.routeID;
  }

  getRouteType(): string {
    const members = get(membersMap, this);

    if (!members.routeType) {
      members.routeType = members.routeViewDriver.getRouteType();
    }

    return members.routeType;
  }

  getParams(): Record<string, string> {
    const members = get(membersMap, this);

    if (!members.params) {
      members.params = members.routeViewDriver.getParams();
    }

    return members.params;
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
