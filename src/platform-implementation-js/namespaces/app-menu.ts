export type AppMenuItemDescriptor = {
  name: string;
  iconElement: string;
  className?: string;
  orderHint?: 2;
  routeID?: string;
  routeParams?: {};
  // TBD
};

type AppMenuItemView = {
  addCollapsiblePanel: (
    panelDescriptor: AppMenuItemPanelDescriptor
  ) => CollapsiblePanelView;
  update: (menuItemDescriptor: AppMenuItemDescriptor) => void;
  destroy: () => void;
  // typed-emitter
  on: (event: 'click' | 'hover?') => void;
};

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
  addMenuItem(menuItemDescriptor: AppMenuItemDescriptor): AppMenuItemView {
    // TODO: should we support the Observable being passed in
    // AppMenuItemView
  }
  isShown(panelIndex: number) {
    // TODO: use orderHint or panelIndex ?
  }
  isCollapsiblePanelShown(panelIndex: number) {}
}
