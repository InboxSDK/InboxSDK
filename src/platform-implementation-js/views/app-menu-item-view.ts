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
  #gmailView?: GmailAppMenuItemView;

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

    gmailAppMenuItemView.then((gmailView) => {
      if (this.#destroyed || !gmailView) {
        return; //we have been removed already
      }
      // TODO the nav item stores promise instead, should we do the same?
      this.#gmailView = gmailView;
    });
  }

  addCollapsiblePanel(
    panelDescriptor: AppMenuItemPanelDescriptor
  ): CollapsiblePanelView {}

  update(menuItemDescriptor: AppMenuItemDescriptor) {
    this.#gmailView!.menuItemDescriptor = menuItemDescriptor;
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.emit('destroy');
    this.#gmailView?.destroy();
  }
}
