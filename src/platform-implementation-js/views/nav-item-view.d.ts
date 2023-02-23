import * as Kefir from 'kefir';
import EventEmitter from 'events';
import { NavItemDescriptor } from '../../inboxsdk';
import GmailNavItemView from '../dom-driver/gmail/views/gmail-nav-item-view';
import { Driver } from '../driver-interfaces/driver';

export default class NavItemView extends EventEmitter {
  constructor(
    appId: string,
    driver: Driver,
    navItemDescriptorPropertyStream: Kefir.Observable<any, any>,
    gmailNavItemView: Promise<GmailNavItemView>
  );

  addNavItem(
    descriptor:
      | NavItemDescriptor
      | Kefir.Observable<NavItemDescriptor | null, unknown>
  ): NavItemView;
  remove(): void;
  setCollapsed(collapseState: boolean): void;
  isCollapsed(): boolean;
  destroyed: boolean;
}
