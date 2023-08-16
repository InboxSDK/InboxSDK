import Kefir, { type Observable } from 'kefir';
import kefirCast from 'kefir-cast';
import get from '../../common/get-or-fail';
import NavItemView from '../views/nav-item-view';
import NativeNavItemView from '../views/native-nav-item-view';
import type { Driver } from '../driver-interfaces/driver';
import NavItemTypes from '../constants/nav-item-types';
import type { NavItemDescriptor, NavMenu as INavMenu } from '../../inboxsdk';

const memberMap = new WeakMap<
  NavMenu,
  {
    appId: string;
    driver: Driver;
    navItemViews: NativeNavItemView[];
  }
>();

export default class NavMenu implements INavMenu {
  NavItemTypes = NavItemTypes;
  SENT_MAIL: NativeNavItemView;

  constructor(appId: string, driver: Driver) {
    const members = {
      appId,
      driver,
      navItemViews: [],
    };
    memberMap.set(this, members);
    this.SENT_MAIL = _setupSentMail(appId, driver);
  }

  addNavItem(
    navItemDescriptor:
      | NavItemDescriptor
      | Observable<NavItemDescriptor, unknown>
  ): NavItemView {
    const members = get(memberMap, this);
    const navItemDescriptorPropertyStream = kefirCast(
      Kefir,
      navItemDescriptor
    ).toProperty() as Observable<NavItemDescriptor, unknown>;
    const navItemView = new NavItemView(
      members.appId,
      members.driver,
      navItemDescriptorPropertyStream,
      members.driver.addNavItem(members.appId, navItemDescriptorPropertyStream)
    );
    members.navItemViews.push(navItemView);
    return navItemView;
  }

  // TODO: this doesn't seem to be used.
  static SENT_MAIL: Record<string, any> | null | undefined = null;
}

function _setupSentMail(appId: string, driver: Driver) {
  const nativeNavItemView = new NativeNavItemView(
    appId,
    driver,
    'sent',
    driver.getSentMailNativeNavItem() as any
  );
  return nativeNavItemView;
}
