/* @flow */

import isEqual from 'lodash/isEqual';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import defer from '../../common/defer';
import get from '../../common/get-or-fail';
import EventEmitter from '../lib/safe-event-emitter';

import NAV_ITEM_TYPES from '../constants/nav-item-types';

import type { Driver } from '../driver-interfaces/driver';
import type GmailNavItemView from '../dom-driver/gmail/views/gmail-nav-item-view';

const memberMap = new WeakMap();

// documented in src/docs/

export default class NavItemView extends EventEmitter {
  destroyed: boolean = false;

  constructor(
    appId: string,
    driver: Driver,
    navItemDescriptorPropertyStream: Object,
    navItemViewDriverPromise: Promise<GmailNavItemView>
  ) {
    super();

    const members = {
      appId,
      driver,
      navItemDescriptorPropertyStream,
      navItemViews: [],
      navItemViewDriver: (null: ?GmailNavItemView),
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
        .sampledBy(navItemViewDriver.getEventStream(), (a, b) => [a, b])
        .onValue((navItemDescriptor) =>
          _handleViewDriverStreamEvent(
            this,
            navItemViewDriver,
            driver,
            navItemDescriptor
          )
        );

      Kefir.combine([
        members.navItemDescriptorPropertyStream,
        driver.getRouteViewDriverStream(),
      ])
        .takeUntilBy(
          navItemViewDriver
            .getEventStream()
            .filter(() => false)
            .beforeEnd(() => null)
        )
        .onValue((x) => {
          _handleRouteViewChange(navItemViewDriver, x);
        });
    });
  }

  addNavItem(navItemDescriptor: Object): NavItemView {
    if (this.destroyed) throw new Error('this nav item view does not exist');

    const members = get(memberMap, this);
    const driver = members.driver;
    const appId = members.appId;
    const navItemViews = members.navItemViews;

    const navItemDescriptorPropertyStream = kefirCast(
      Kefir,
      navItemDescriptor
    ).toProperty();
    const childNavItemView = new NavItemView(
      appId,
      driver,
      navItemDescriptorPropertyStream,
      members.navItemViewDriverPromise.then((navItemViewDriver) => {
        const childNavItemViewDriver = navItemViewDriver.addNavItem(
          members.appId,
          navItemDescriptorPropertyStream
        );
        return childNavItemViewDriver;
      })
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

    members.navItemViewDriverPromise.then((navItemViewDriver) => {
      navItemViewDriver.destroy();
    });
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
    get(memberMap, this).navItemViewDriverPromise.then((navItemViewDriver) => {
      navItemViewDriver.setCollapsed(collapseValue);
    });
  }
}

function _handleViewDriverStreamEvent(
  eventEmitter,
  navItemViewDriver,
  driver,
  [navItemDescriptor, event]
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

        navItemDescriptor.onClick(syntheticEvent);

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
  navItemViewDriver,
  [navItemDescriptor, routeViewDriver]
) {
  navItemViewDriver.setActive(
    navItemDescriptor &&
      routeViewDriver.getRouteID() === navItemDescriptor.routeID &&
      isEqual(navItemDescriptor.routeParams || {}, routeViewDriver.getParams())
  );
}
