import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
import { GmailAppMenuItemView } from '../dom-driver/gmail/views/gmail-app-menu-item-view';
import { Driver } from '../driver-interfaces/driver';
import {
  AppMenuItemDescriptor,
  AppMenuItemPanelDescriptor,
  CollapsiblePanelView,
} from '../namespaces/app-menu';

type MessageEvents = {
  click: () => void;
  hover: () => void;
  destroy: () => void;
};

export class AppMenuItemView extends (EventEmitter as new () => TypedEmitter<MessageEvents>) {
  #driver;
  #destroyed = false;
  #gmailViewPromise: Promise<GmailAppMenuItemView>;

  constructor(
    appId: string,
    driver: Driver,
    menuItemDescriptor: AppMenuItemDescriptor
  ) {
    super();
    this.#driver = driver;

    const gmailAppMenuItemView = this.#driver.addAppMenuItem(
      appId,
      menuItemDescriptor
    );

    this.#gmailViewPromise = gmailAppMenuItemView;

    gmailAppMenuItemView.then((gmailView) => {
      if (this.#destroyed || !gmailView) {
        return; //we have been removed already
      }
      // add callbacks and listeners here
    });
  }

  addCollapsiblePanel(
    panelDescriptor: AppMenuItemPanelDescriptor
  ): CollapsiblePanelView {
    return {} as any;
  }

  async update(menuItemDescriptor: AppMenuItemDescriptor) {
    const gmailView = await this.#gmailViewPromise;
    gmailView.menuItemDescriptor = menuItemDescriptor;
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.emit('destroy');
    this.#gmailViewPromise.then((gmailView) => gmailView.remove());
  }
}
