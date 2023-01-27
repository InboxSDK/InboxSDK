import type { Driver } from '../driver-interfaces/driver';
import { AppMenuItemView } from '../views/app-menu-item-view';

export type AppMenuItemDescriptor = {
  name: string;
  iconElement: string;
  className?: string;
  onClick?: (e?: MouseEvent) => void | null;
  onHover?: (e?: MouseEvent) => void | null;
  orderHint?: number;
  routeID?: string;
  routeParams?: {};
  // TBD
};

// type AppMenuItemView = {
//   addCollapsiblePanel: (
//     panelDescriptor: AppMenuItemPanelDescriptor
//   ) => CollapsiblePanelView;
//   update: (menuItemDescriptor: AppMenuItemDescriptor) => void;
//   destroy: () => void;
//   // typed-emitter
//   on: (event: 'click' | 'hover?') => void;
// };

export type AppMenuItemPanelDescriptor = {
  contentElement: string;
  className?: string;
  popoverClassName?: string;
  // TBD
  // Aleem: add ability to add primary/secondary button to all panels (mainly ours but Google's too)
};

export type CollapsiblePanelView = {
  update: (panelDescriptor: AppMenuItemPanelDescriptor) => void;
  destroy: () => void;
  collapse: (state: boolean) => boolean;
  isCollapsed: () => boolean;
  // TBD
  // Aleem: add ability to add primary/secondary button to all panels (mainly ours but Google's too)
  // typed-emitter
  on: (event: 'show' | 'hide' | 'active') => void;
};

export default class AppMenu {
  #appId;
  #driver;
  // #menuItemViews: AppMenuItemView[] = [];

  constructor(appId: string, driver: Driver) {
    this.#appId = appId;
    this.#driver = driver;
  }

  addMenuItem(menuItemDescriptor: AppMenuItemDescriptor): AppMenuItemView {
    // TODO: should we support the Observable being passed in

    const navItemView = new AppMenuItemView(
      this.#appId,
      this.#driver,
      menuItemDescriptor
    );

    // this.#menuItemViews.push(navItemView);
    return navItemView;
  }

  isAppMenuBarShown() {}

  isCollapsiblePanelShown(panelIndex: number) {}
}
