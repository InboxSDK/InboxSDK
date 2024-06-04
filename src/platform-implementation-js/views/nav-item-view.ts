import isEqual from 'lodash/isEqual';
import Kefir, { Observable } from 'kefir';
import kefirCast from 'kefir-cast';
import EventEmitter from '../lib/safe-event-emitter';
import NAV_ITEM_TYPES from '../constants/nav-item-types';
import type { Driver } from '../driver-interfaces/driver';
import type GmailNavItemView from '../dom-driver/gmail/views/gmail-nav-item-view';
import type {
  NavItemDescriptor,
  NavItemEvent,
} from '../dom-driver/gmail/views/gmail-nav-item-view';
import type { RouteViewDriver } from '../driver-interfaces/route-view-driver';
import type { Descriptor } from '../../types/descriptor';
import type TypedEventEmitter from 'typed-emitter';

export default class NavItemView extends (EventEmitter as new () => TypedEventEmitter<{
  collapsed(): void;
  destroy(): void;
  expanded(): void;
  inserted(): void;
}>) {
  #appId: string;
  #driver: Driver;
  #navItemDescriptorPropertyStream: Observable<NavItemDescriptor, unknown>;
  #navItemViews: NavItemView[] = [];
  #navItemViewDriver: GmailNavItemView | null | undefined = null;
  #navItemViewDriverPromise: Promise<GmailNavItemView>;
  destroyed: boolean = false;

  constructor(
    appId: string,
    driver: Driver,
    navItemDescriptorPropertyStream: Observable<NavItemDescriptor, unknown>,
    navItemViewDriverPromise: Promise<GmailNavItemView>,
  ) {
    super();
    this.#appId = appId;
    this.#driver = driver;
    this.#navItemDescriptorPropertyStream = navItemDescriptorPropertyStream;
    this.#navItemViewDriverPromise = navItemViewDriverPromise;

    driver.getStopper().onValue(this.remove.bind(this));
    navItemViewDriverPromise.then((navItemViewDriver) => {
      if (this.destroyed || !navItemViewDriver) {
        return; //we have been removed already
      }

      const driver = this.#driver;
      this.#navItemViewDriver = navItemViewDriver;
      this.#navItemDescriptorPropertyStream
        .sampledBy(
          navItemViewDriver.getEventStream(),
          (a, b) => [a, b] as const,
        )
        .onValue((navItemDescriptor) =>
          this.#handleViewDriverStreamEvent(
            navItemViewDriver,
            navItemDescriptor,
          ),
        );
      Kefir.combine([
        this.#navItemDescriptorPropertyStream,
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

  addNavItem(
    navItemDescriptor: Descriptor<NavItemDescriptor | null>,
  ): NavItemView {
    if (this.destroyed) throw new Error('this nav item view does not exist');
    const driver = this.#driver;
    const appId = this.#appId;
    const navItemViews = this.#navItemViews;
    const navItemDescriptorPropertyStream = kefirCast(
      Kefir,
      navItemDescriptor,
    ).toProperty() as Observable<NavItemDescriptor, unknown>;
    const childNavItemView = new NavItemView(
      appId,
      driver,
      navItemDescriptorPropertyStream,
      this.#navItemViewDriverPromise.then(
        (navItemViewDriver: GmailNavItemView) => {
          const childNavItemViewDriver = navItemViewDriver.addNavItem(
            this.#appId,
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

    const navItemViews = this.#navItemViews;
    this.destroyed = true;
    this.emit('destroy');
    navItemViews.forEach(function (navItemView) {
      navItemView.remove();
    });
    this.#navItemViewDriverPromise.then(
      (navItemViewDriver: GmailNavItemView) => {
        navItemViewDriver.destroy();
      },
    );
  }

  isCollapsed(): boolean {
    const navItemViewDriver = this.#navItemViewDriver;

    if (navItemViewDriver) {
      return navItemViewDriver.isCollapsed();
    } else {
      return false;
    }
  }

  setCollapsed(collapseValue: boolean) {
    this.#navItemViewDriverPromise.then(
      (navItemViewDriver: GmailNavItemView) => {
        navItemViewDriver.setCollapsed(collapseValue);
      },
    );
  }

  getElement() {
    return this.#navItemViewDriverPromise.then((navItemViewDriver) =>
      navItemViewDriver.getElement(),
    );
  }

  #handleViewDriverStreamEvent(
    navItemViewDriver: GmailNavItemView,
    [navItemDescriptor, event]: readonly [NavItemDescriptor, NavItemEvent],
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
          this.#driver.goto(
            navItemDescriptor.routeID,
            navItemDescriptor.routeParams,
          );
        } else {
          navItemViewDriver.toggleCollapse();
        }

        break;

      case 'expanded':
      case 'collapsed':
        this.emit(event.eventName);
        break;
    }
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
