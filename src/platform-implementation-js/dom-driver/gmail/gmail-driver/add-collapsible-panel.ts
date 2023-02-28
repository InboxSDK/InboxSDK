import once from 'lodash/once';

import { AppMenuItemPanelDescriptor } from '../../../namespaces/app-menu';
import GmailElementGetter from '../gmail-element-getter';
import waitFor from '../../../lib/wait-for';
import Logger from '../../../lib/logger';
import { CollapsiblePanelView } from '../../../views/collapsible-panel-view';
import GmailDriver from '../gmail-driver';

export async function addCollapsiblePanel(
  driver: GmailDriver,
  panelDescriptor: AppMenuItemPanelDescriptor
) {
  const injectionContainer = await waitForAppMenuParentReady();

  const collapsiblePanelView = new CollapsiblePanelView(
    driver,
    panelDescriptor
  );

  if (!injectionContainer || !collapsiblePanelView.element) return;

  const appMenu = await GmailElementGetter.getAppMenuAsync();

  if (!appMenu) return;

  appMenu.insertAdjacentElement('afterend', collapsiblePanelView.element);

  return collapsiblePanelView;
}

const waitForAppMenuParentReady = once(async () => {
  if (!GmailElementGetter.isStandalone()) {
    try {
      const menuParentElement = await waitFor(() =>
        GmailElementGetter.getAppMenuContainer()
      );

      return menuParentElement;
    } catch (e) {
      Logger.error(e);
    }
  }
});
