import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import get from '../../common/get-or-fail';
import NavItemView from '../views/nav-item-view';
import NativeNavItemView from '../views/native-nav-item-view';
import type { Driver } from '../driver-interfaces/driver';
import NavItemTypes from '../constants/nav-item-types';
const memberMap = new WeakMap();
export default class NavMenu {
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

  addNavItem(navItemDescriptor: Record<string, any>): NavItemView {
    const members = get(memberMap, this);
    const navItemDescriptorPropertyStream = kefirCast(
      Kefir,
      navItemDescriptor
    ).toProperty();
    const navItemView = new NavItemView(
      members.appId,
      members.driver,
      navItemDescriptorPropertyStream,
      members.driver.addNavItem(members.appId, navItemDescriptorPropertyStream)
    );
    members.navItemViews.push(navItemView);
    return navItemView;
  }

  static SENT_MAIL: Record<string, any> | null | undefined = null;
}

function _setupSentMail(appId, driver) {
  const nativeNavItemView = new NativeNavItemView(
    appId,
    driver,
    'sent',
    driver.getSentMailNativeNavItem()
  );
  return nativeNavItemView;
}
