import ComposeView from '../../../views/compose-view';

export interface DrawerViewOptions {
  el: HTMLElement;
  title?: string;
  chrome?: boolean;
  composeView?: ComposeView;
  closeWithCompose?: boolean;
  matchSidebarContentPanelWidth?: boolean;
}

export default class InboxDrawerView {
  constructor(options: DrawerViewOptions);
}
