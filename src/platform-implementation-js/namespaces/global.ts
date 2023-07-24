import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import ContentPanelView from '../views/content-panel-view';
import get from '../../common/get-or-fail';
import type { PiOpts } from '../platform-implementation';
import type { Driver } from '../driver-interfaces/driver';
import GmailSupportItemView from '../dom-driver/gmail/views/gmail-support-item-view';
import type { SupportItemDescriptor } from '../dom-driver/gmail/views/gmail-support-item-view';

const memberMap = new WeakMap<
  Global,
  {
    appId: string;
    driver: Driver;
    piOpts: PiOpts;
  }
>();

export default class Global {
  constructor(appId: string, driver: Driver, piOpts: PiOpts) {
    const members = {
      appId,
      driver,
      piOpts,
    };
    memberMap.set(this, members);
  }

  async addSidebarContentPanel(
    descriptor: Record<string, any>
  ): Promise<ContentPanelView | null | undefined> {
    const descriptorPropertyStream = kefirCast(Kefir, descriptor).toProperty();
    const members = get(memberMap, this);
    members.driver.getLogger().eventSdkPassive('global.addSidebarContentPanel');
    const contentPanelImplementation =
      await members.driver.addGlobalSidebarContentPanel(
        descriptorPropertyStream
      );

    if (contentPanelImplementation) {
      return new ContentPanelView(contentPanelImplementation);
    }

    return null;
  }

  addSupportItem(
    supportItemDescriptor: SupportItemDescriptor
  ): GmailSupportItemView {
    const members = get(memberMap, this);
    members.driver.getLogger().eventSdkPassive('global.addSupportItem');
    return members.driver.addSupportItem(supportItemDescriptor);
  }
}
