import EventEmitter from '../lib/safe-event-emitter';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import get from '../../common/get-or-fail';
import NavItemView from './nav-item-view';
import type { Driver } from '../driver-interfaces/driver';
import type GmailNavItemView from '../dom-driver/gmail/views/gmail-nav-item-view';
import type { NavItemDescriptor } from '../dom-driver/gmail/views/gmail-nav-item-view';

interface Members {
  appId: string;
  driver: Driver;
  labelName: string;
  navItemViews: NavItemView[];
  navItemViewDriver: GmailNavItemView | null | undefined;
  navItemViewDriverPromise: Promise<GmailNavItemView>;
}
const memberMap = new WeakMap<NativeNavItemView, Members>();

export default class NativeNavItemView extends EventEmitter {
  constructor(
    appId: string,
    driver: Driver,
    labelName: string,
    navItemViewDriverPromise: Promise<GmailNavItemView>
  ) {
    super();
    const members = {
      appId,
      driver,
      labelName,
      navItemViews: [],
      navItemViewDriver: null as GmailNavItemView | null | undefined,
      navItemViewDriverPromise,
    };
    memberMap.set(this, members);
    navItemViewDriverPromise.then((navItemViewDriver) => {
      if (!navItemViewDriver) {
        return;
      }

      members.navItemViewDriver = navItemViewDriver;
      navItemViewDriver
        .getEventStream()
        .onValue((event) => _handleStreamEvent(this, event));
      this.emit('inserted');
    });
  }

  addNavItem(navItemDescriptor: NavItemDescriptor): NavItemView {
    const members = get(memberMap, this);
    const navItemDescriptorPropertyStream = kefirCast(
      Kefir,
      navItemDescriptor
    ).toProperty();
    const childNavItemView = new NavItemView(
      members.appId,
      members.driver,
      navItemDescriptorPropertyStream,
      members.navItemViewDriverPromise.then((navItemViewDriver) => {
        const childNavItemViewDriver = navItemViewDriver.addNavItem(
          members.appId,
          navItemDescriptorPropertyStream
        );
        return childNavItemViewDriver;
      })
    );
    members.navItemViews.push(childNavItemView);
    return childNavItemView;
  }

  isCollapsed(): boolean {
    return (
      localStorage.getItem(
        'inboxsdk__nativeNavItem__state_' + get(memberMap, this).labelName
      ) === 'collapsed'
    );
  }

  setCollapsed(collapseValue: boolean) {
    const members = get(memberMap, this);

    if (members.navItemViewDriver) {
      members.navItemViewDriver.setCollapsed(collapseValue);
    } else {
      localStorage.setItem(
        'inboxsdk__nativeNavItem__state_' + members.labelName,
        collapseValue ? 'collapsed' : 'expanded'
      );
    }
  }
}

function _handleStreamEvent(
  emitter: NativeNavItemView,
  event: { eventName: string }
) {
  switch (event.eventName) {
    case 'expanded':
    case 'collapsed':
      emitter.emit(event.eventName);
      break;
  }
}
