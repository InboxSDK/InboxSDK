import Kefir, { Observable } from 'kefir';
import kefirCast from 'kefir-cast';
import ContentPanelView from '../views/content-panel-view';
import type { PiOpts } from '../platform-implementation';
import type { Driver } from '../driver-interfaces/driver';
import GmailSupportItemView from '../dom-driver/gmail/views/gmail-support-item-view';
import type { SupportItemDescriptor } from '../dom-driver/gmail/views/gmail-support-item-view';
import { type ContentPanelDescriptor } from '../driver-common/sidebar/ContentPanelViewDriver';

export default class Global {
  #driver: Driver;
  #piOpts: PiOpts;

  constructor(appId: string, driver: Driver, piOpts: PiOpts) {
    this.#driver = driver;
    this.#piOpts = piOpts;
  }

  async addSidebarContentPanel(
    descriptor: Observable<ContentPanelDescriptor, unknown>,
  ): Promise<ContentPanelView | null | undefined> {
    const descriptorPropertyStream = kefirCast(Kefir, descriptor).toProperty();
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
