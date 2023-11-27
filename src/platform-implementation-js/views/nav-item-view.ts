import isEqual from 'lodash/isEqual';
import Kefir, { Observable } from 'kefir';
import kefirCast from 'kefir-cast';
import get from '../../common/get-or-fail';
import EventEmitter from '../lib/safe-event-emitter';
import NAV_ITEM_TYPES from '../constants/nav-item-types';
import type { Driver } from '../driver-interfaces/driver';
import type GmailNavItemView from '../dom-driver/gmail/views/gmail-nav-item-view';
import { NavItemDescriptor } from '../dom-driver/gmail/views/gmail-nav-item-view';
import { RouteViewDriver } from '../driver-interfaces/route-view-driver';
interface Members {
  appId: string;
  driver: Driver;
  navItemDescriptorPropertyStream: Observable<NavItemDescriptor, unknown>;
  navItemViews: NavItemView[];
  navItemViewDriver: GmailNavItemView | null | undefined;
  navItemViewDriverPromise: Promise<GmailNavItemView>;
}
const memberMap = new WeakMap<NavItemView, Members>();

export default class NavItemView extends EventEmitter {
  destroyed: boolean = false;

  constructor(
    appId: string,
    driver: Driver,
    navItemDescriptorPropertyStream: Observable<NavItemDescriptor, unknown>,
    navItemViewDriverPromise: Promise<GmailNavItemView>,
  ) {
    super();
    const members = {
      appId,
      driver,
      navItemDescriptorPropertyStream,
      navItemViews: [],
      navItemViewDriver: null as GmailNavItemView | null | undefined,
      navItemViewDriverPromise,
    };
    memberMap.set(this, members);
    driver.getStopper().onValue(this.remove.bind(this));
    navItemViewDriverPromise.then((navItemViewDriver) => {
      if (this.destroyed || !navItemViewDriver) {
        return; //we have been removed already
      }

      const driver = members.driver;
      members.navItemViewDriver = navItemViewDriver;
      members.navItemDescriptorPropertyStream
        .sampledBy(
          navItemViewDriver.getEventStream(),
          (a, b) => [a, b] as const,
        )
        .onValue((navItemDescriptor) =>
          _handleViewDriverStreamEvent(
            this,
            navItemViewDriver,
            driver,
            navItemDescriptor,
          ),
        );
      Kefir.combine([
        members.navItemDescriptorPropertyStream,
        driver.getRouteViewDriverStream(),
      ])
        .takeUntilBy(
          navItemViewDriver
            .getEventStream()
            .filter(() => false)
            .beforeEnd(() => null),
        )
        .onValue((x) => {
          _handleRouteViewChange(navItemViewDriver, x);
        });
      this.emit('inserted');
    });
  }

  addNavItem(navItemDescriptor: Record<string, any>): NavItemView {
    if (this.destroyed) throw new Error('this nav item view does not exist');
    const members = get(memberMap, this);
    const driver = members.driver;
    const appId = members.appId;
    const navItemViews = members.navItemViews;
    const navItemDescriptorPropertyStream = kefirCast(
      Kefir,
      navItemDescriptor,
    ).toProperty();
    const childNavItemView = new NavItemView(
      appId,
      driver,
      navItemDescriptorPropertyStream,
      members.navItemViewDriverPromise.then(
        (navItemViewDriver: GmailNavItemView) => {
          const childNavItemViewDriver = navItemViewDriver.addNavItem(
            members.appId,
            navItemDescriptorPropertyStream,
          );
          return childNavItemViewDriver;
        },
      ),
    );
    navItemViews.push(childNavItemView);
    return childNavItemView;
  }

  remove() {
    if (this.destroyed) {
      return;
    }

    const members = get(memberMap, this);
    const { navItemViews } = members;
    this.destroyed = true;
    this.emit('destroy');
    navItemViews.forEach(function (navItemView) {
      navItemView.remove();
    });
    members.navItemViewDriverPromise.then(
      (navItemViewDriver: GmailNavItemView) => {
        navItemViewDriver.destroy();
      },
    );
  }

  isCollapsed(): boolean {
    const members = get(memberMap, this);
    const navItemViewDriver = members.navItemViewDriver;

    if (navItemViewDriver) {
      return navItemViewDriver.isCollapsed();
    } else {
      return false;
    }
  }

  setCollapsed(collapseValue: boolean) {
    get(memberMap, this).navItemViewDriverPromise.then(
      (navItemViewDriver: GmailNavItemView) => {
        navItemViewDriver.setCollapsed(collapseValue);
      },
    );
  }

  getElement() {
    return get(memberMap, this).navItemViewDriverPromise.then(
      (navItemViewDriver) => navItemViewDriver.getElement(),
    );
  }
}

function _handleViewDriverStreamEvent(
  eventEmitter: EventEmitter,
  navItemViewDriver: GmailNavItemView,
  driver: Driver,
  [navItemDescriptor, event]: readonly [NavItemDescriptor, any],
) {
  switch (event.eventName) {
    case 'click':
      // When in Gmailv2, we ignore the onClick, routeID, and routeParams options on GROUPER nav-items
      if (navItemDescriptor.type === NAV_ITEM_TYPES.GROUPER) return;

      if (typeof navItemDescriptor.onClick === 'function') {
        let defaultPrevented = false;
        const syntheticEvent = {
          preventDefault() {
            defaultPrevented = true;
          },
        };
        // TODO: is this synthetic event ever used?
        (navItemDescriptor.onClick as any)(syntheticEvent);

        if (defaultPrevented) {
          break;
        }
      }

      if (navItemDescriptor.routeID) {
        driver.goto(navItemDescriptor.routeID, navItemDescriptor.routeParams);
      } else {
        navItemViewDriver.toggleCollapse();
      }

      break;

    case 'expanded':
    case 'collapsed':
      eventEmitter.emit(event.eventName);
      break;
  }
}

function _handleRouteViewChange(
  navItemViewDriver: GmailNavItemView,
  [navItemDescriptor, routeViewDriver]: [NavItemDescriptor, RouteViewDriver],
) {
  navItemViewDriver.setActive(
    navItemDescriptor &&
      routeViewDriver.getRouteID() === navItemDescriptor.routeID &&
      isEqual(navItemDescriptor.routeParams || {}, routeViewDriver.getParams()),
  );
}
