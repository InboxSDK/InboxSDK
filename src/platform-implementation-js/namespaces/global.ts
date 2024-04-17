import Kefir, { Observable } from 'kefir';
import kefirCast from 'kefir-cast';
import ContentPanelView from '../views/content-panel-view';
import type { Driver } from '../driver-interfaces/driver';
import GmailSupportItemView from '../dom-driver/gmail/views/gmail-support-item-view';
import type { SupportItemDescriptor } from '../dom-driver/gmail/views/gmail-support-item-view';
import { type ContentPanelDescriptor } from '../driver-common/sidebar/ContentPanelViewDriver';

export default class Global {
  #driver: Driver;

  constructor(appId: string, driver: Driver) {
    this.#driver = driver;
  }

  get gmailTheme() {
    return this.#driver.gmailTheme;
  }

  async addSidebarContentPanel(
    descriptor:
      | ContentPanelDescriptor
      | Observable<ContentPanelDescriptor, unknown>,
  ): Promise<ContentPanelView | null> {
    // kefirCast casts to Observable<any, any> which is not what we want
    const descriptorPropertyStream: Observable<
      ContentPanelDescriptor,
      unknown
    > = kefirCast(Kefir, descriptor).toProperty();
    this.#driver.getLogger().eventSdkPassive('global.addSidebarContentPanel');
    const contentPanelImplementation =
      await this.#driver.addGlobalSidebarContentPanel(descriptorPropertyStream);

    if (contentPanelImplementation) {
      return new ContentPanelView(contentPanelImplementation);
    }

    return null;
  }

  addSupportItem(
    supportItemDescriptor: SupportItemDescriptor,
  ): GmailSupportItemView {
    this.#driver.getLogger().eventSdkPassive('global.addSupportItem');
    return this.#driver.addSupportItem(supportItemDescriptor);
  }
}
